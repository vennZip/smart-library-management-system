import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

// Real PostgreSQL engine, ephemeral fixtures. Supabase identity helpers are
// simulated; cron registration is captured, while jobs are invoked explicitly.
let db
const ids = {
  student: '10000000-0000-4000-8000-000000000001',
  other: '10000000-0000-4000-8000-000000000002',
  staff: '10000000-0000-4000-8000-000000000003',
  book: '20000000-0000-4000-8000-000000000001',
  copy: '30000000-0000-4000-8000-000000000001',
  loan: '40000000-0000-4000-8000-000000000001',
}
async function owner() { await db.exec('reset role') }
async function asUser(id = ids.student, role = 'student') {
  await owner()
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: id, app_metadata: { role } })])
  await db.exec('set role authenticated')
}
async function scalar(sql, params = []) { return Object.values((await db.query(sql, params)).rows[0])[0] }
async function fixture(due = '2 days') {
  await owner()
  await db.query("insert into public.loans(id,copy_id,member_id,issued_by,borrowed_at,due_at) values($1,$2,$3,$4,now()-interval '10 days',now()+$5::interval)", [ids.loan, ids.copy, ids.student, ids.staff, due])
  await db.query("update public.book_copies set status='on_loan' where id=$1", [ids.copy])
}
async function renew() {
  const due = await scalar('select due_at from public.loans where id=$1', [ids.loan])
  return db.query('select * from public.renew_loan($1,$2)', [ids.loan, due])
}
async function resolve(kind = 'lost', charge = 10000, fine = 0) {
  return db.query('select * from public.resolve_loan_incident($1,$2,$3,$4,now(),$5)', [ids.loan, kind, 'Recorded during inspection', charge, fine])
}
before(async () => {
  db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema extensions; create schema cron;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth,public to authenticated,anon;
    grant execute on function auth.uid(),auth.jwt() to authenticated,anon;
    create table cron.registered_jobs(name text primary key,schedule text,command text);
    create function cron.schedule(text,text,text) returns bigint language plpgsql as $$begin
      insert into cron.registered_jobs values($1,$2,$3) on conflict(name) do update set schedule=excluded.schedule,command=excluded.command; return 1; end;$$;
  `)
  const dir = new URL('../supabase/migrations/', import.meta.url)
  for (const file of (await readdir(dir)).filter(name => name.endsWith('.sql')).sort()) {
    const sql = (await readFile(new URL(file, dir), 'utf8')).replace('create extension if not exists pg_cron;', '-- pg_cron scheduler captured by the test adapter')
    try { await db.exec(sql) } catch (error) { throw new Error(`Migration ${file}: ${error.message}`, { cause: error }) }
  }
})
after(async () => { await db?.close() })
beforeEach(async () => {
  await owner()
  await db.exec('truncate public.notifications, public.loan_incidents, public.fine_transactions, public.fines, public.reservations, public.loans, public.book_copies, public.books, public.profiles, auth.users cascade')
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)', [ids.student, 'student@example.test', ids.other, 'other@example.test', ids.staff, 'staff@example.test'])
  await db.query("insert into public.books(id,isbn,title,author,category) values($1,'978-0132350884','Algorithms','An Author','Computing')", [ids.book])
  await db.query("insert into public.book_copies(id,book_id,barcode,shelf_location) values($1,$2,'TEST-001','A-1')", [ids.copy, ids.book])
})

test('all migrations apply and register the 15-minute database job', async () => {
  assert.deepEqual((await db.query('select * from cron.registered_jobs')).rows, [{ name: 'library-notifications', schedule: '*/15 * * * *', command: 'select public.run_library_notifications()' }])
})
test('renewal extends by seven days once, preserves metadata, and clears old reminders', async () => {
  await fixture(); await asUser()
  await db.exec('select public.refresh_my_notifications()')
  assert.equal(await scalar("select count(*)::int from public.notifications where kind='due_soon'"), 1)
  const oldDue = new Date(await scalar('select due_at from public.loans'))
  const result = (await renew()).rows[0]
  assert.equal(new Date(result.due_at) - oldDue, 7 * 86400000)
  assert.equal(result.renewal_count, 1); assert.equal(result.renewed_by, ids.student)
  assert.equal(await scalar("select count(*)::int from public.notifications where kind='due_soon'"), 0)
  assert.equal(await scalar("select count(*)::int from public.notifications where kind='renewed'"), 1)
  await assert.rejects(renew, /one renewal/)
})
test('another member cannot inspect or renew a loan, or update loans directly', async () => {
  await fixture(); await asUser(ids.other)
  assert.equal(await scalar('select public.loan_renewal_context($1)', [ids.loan]), null)
  await assert.rejects(() => db.query('select public.renew_loan($1,now())', [ids.loan]), /access denied/)
  await assert.rejects(() => db.query('update public.loans set renewal_count=0 where id=$1', [ids.loan]), /permission denied/)
})
test('pending waitlist entries block renewal even though the borrower cannot read them', async () => {
  await fixture(); await asUser(ids.other)
  await db.query('select public.create_reservation($1)', [ids.book])
  assert.equal(await scalar("select count(*)::int from public.notifications where kind='waitlist_joined'"), 1)
  await asUser()
  assert.equal(await scalar('select count(*)::int from public.reservations'), 0)
  assert.equal((await scalar('select public.loan_renewal_context($1)', [ids.loan])).hasWaitlist, true)
  await assert.rejects(renew, /waitlist/)
})
test('suspension and the exact fine-block threshold reject renewals', async () => {
  await fixture()
  await db.query("update public.profiles set status='suspended' where id=$1", [ids.student])
  await asUser(); await assert.rejects(renew, /Suspended/)
  await owner(); await db.query("update public.profiles set status='active' where id=$1", [ids.student])
  await db.query('insert into public.fines(loan_id,member_id,overdue_days,original_amount_cents,balance_cents) values($1,$2,1,50000,50000)', [ids.loan, ids.student])
  await asUser(); await assert.rejects(renew, /balance/)
})
test('overdue loans cannot renew and reminders remain deduplicated after being read', async () => {
  await fixture('-2 days'); await asUser(); await assert.rejects(renew, /Overdue/)
  await db.exec('select public.refresh_my_notifications(); select public.refresh_my_notifications()')
  assert.equal(await scalar('select count(*)::int from public.notifications'), 1)
  await db.exec('update public.notifications set read_at=now(); select public.refresh_my_notifications()')
  assert.equal(await scalar('select count(*)::int from public.notifications where read_at is null'), 0)
})
test('due reminder stages use Philippine calendar dates and the exact due timestamp', async () => {
  await owner()
  assert.equal(await scalar("select public.loan_reminder_kind('2026-11-25T15:00Z','2026-11-24T23:00Z')"), 'due_today')
  assert.equal(await scalar("select public.loan_reminder_kind('2026-11-25T15:00Z','2026-11-25T15:00Z')"), 'overdue')
  assert.equal(await scalar("select public.loan_reminder_kind('2026-11-28T15:00Z','2026-11-24T15:00Z')"), null)
})
test('notifications are private even from staff, and clients can only update read_at', async () => {
  await fixture(); await asUser(); await db.exec('select public.refresh_my_notifications()')
  const id = await scalar('select id from public.notifications')
  await assert.rejects(() => db.query("update public.notifications set message='changed' where id=$1", [id]), /permission denied/)
  await asUser(ids.staff, 'librarian')
  assert.equal(await scalar('select count(*)::int from public.notifications'), 0)
  await db.query('update public.notifications set read_at=now() where id=$1', [id])
  await asUser(); assert.equal(await scalar('select read_at from public.notifications where id=$1', [id]), null)
  await assert.rejects(() => db.exec('select public.run_library_notifications()'), /permission denied/)
})
test('lost resolution closes without a physical return, charges once, and preserves waitlists', async () => {
  await fixture('-36 hours'); await asUser(ids.other); await db.query('select public.create_reservation($1)', [ids.book])
  await asUser(ids.staff, 'librarian')
  const result = (await resolve('lost', 10000, 2000)).rows[0]
  assert.equal(result.status, 'lost'); assert.equal(result.returned_at, null); assert.ok(result.closed_at)
  assert.equal(await scalar('select status from public.book_copies'), 'lost')
  assert.equal(await scalar('select balance_cents from public.fines'), 12000)
  assert.equal(await scalar('select status from public.reservations'), 'pending')
  await assert.rejects(() => resolve('lost', 10000, 2000), /already closed/)
  assert.equal(await scalar('select count(*)::int from public.loan_incidents'), 1)
  await asUser(); assert.equal(await scalar("select count(*)::int from public.notifications where kind='incident'"), 1)
})
test('damage returns the copy to maintenance; repair offers it to the oldest waiter', async () => {
  await fixture(); await asUser(ids.other); await db.query('select public.create_reservation($1)', [ids.book])
  await asUser(ids.staff, 'librarian'); const result = (await resolve('damaged', 0)).rows[0]
  assert.equal(result.status, 'returned'); assert.ok(result.returned_at)
  assert.equal(await scalar('select status from public.book_copies'), 'maintenance')
  assert.equal(await scalar('select count(*)::int from public.fines'), 0)
  await db.query("update public.book_copies set status='available' where id=$1", [ids.copy])
  assert.equal(await scalar('select status from public.book_copies'), 'reserved')
  await asUser(ids.other)
  assert.equal(await scalar("select count(*)::int from public.notifications where kind='waitlist_ready'"), 1)
  assert.equal(await scalar("select count(*)::int from public.notifications where kind='waitlist_joined'"), 0)
})
test('student incidents, invalid charges and bypassing circulation through inventory are rejected', async () => {
  await fixture(); await asUser(); await assert.rejects(resolve, /Staff role/)
  await asUser(ids.staff, 'librarian')
  await assert.rejects(() => resolve('lost', -1), /Invalid incident/)
  await assert.rejects(() => resolve('lost', 10000001), /Invalid incident/)
  await assert.rejects(() => db.query("update public.book_copies set status='lost' where id=$1", [ids.copy]), /Use circulation/)
  assert.equal(await scalar('select status from public.loans'), 'active')
  assert.equal(await scalar('select count(*)::int from public.fines'), 0)
})
test('ordinary return clears reminders and atomically sends a pickup notification', async () => {
  await fixture(); await asUser(); await db.exec('select public.refresh_my_notifications()')
  await asUser(ids.other); await db.query('select public.create_reservation($1)', [ids.book])
  await asUser(ids.staff, 'librarian'); await db.query('select public.return_loan($1,now(),0)', [ids.loan])
  await asUser(); assert.equal(await scalar('select count(*)::int from public.notifications'), 0)
  await asUser(ids.other); assert.equal(await scalar("select count(*)::int from public.notifications where kind='waitlist_ready'"), 1)
})
test('scheduled pickup expiry notifies the first waiter and offers the copy to the next', async () => {
  await fixture(); await asUser(ids.other); await db.query('select public.create_reservation($1)', [ids.book])
  await asUser(ids.staff, 'librarian'); await db.query('select public.return_loan($1,now(),0)', [ids.loan])
  await asUser(); await db.query('select public.create_reservation($1)', [ids.book])
  await owner(); await db.exec("update public.reservations set ready_until=now()-interval '1 hour' where status='ready'; select public.run_library_notifications()")
  await asUser(ids.other); assert.equal(await scalar("select count(*)::int from public.notifications where kind='waitlist_expired'"), 1)
  assert.equal(await scalar("select count(*)::int from public.notifications where kind='waitlist_ready'"), 0)
  await asUser(); assert.equal(await scalar("select count(*)::int from public.notifications where kind='waitlist_ready'"), 1)
})
