-- Requirements: docs/circulation-enhancements.md. Apply after the enum migration.
alter table public.loans
  add column renewal_count integer not null default 0 check (renewal_count between 0 and 1),
  add column renewed_at timestamptz,
  add column renewed_by uuid references public.profiles(id),
  add column previous_due_at timestamptz,
  add column closed_at timestamptz;
update public.loans set closed_at = returned_at where status = 'returned';
alter table public.loans drop constraint returned_loan_is_consistent;
alter table public.loans add constraint returned_loan_is_consistent check (
  (status = 'active' and returned_at is null and closed_at is null) or
  (status = 'returned' and returned_at is not null and returned_at >= borrowed_at) or
  (status = 'lost' and returned_at is null and closed_at is not null and closed_at >= borrowed_at)
);
alter table public.loans add constraint renewal_metadata_consistent check (
  (renewal_count = 0 and renewed_at is null and renewed_by is null and previous_due_at is null) or
  (renewal_count = 1 and renewed_at is not null and renewed_by is not null and previous_due_at is not null and due_at = previous_due_at + interval '168 hours')
);
-- All loan writes now pass through authorized atomic functions.
revoke insert, update on public.loans from authenticated;

create table public.loan_incidents (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null unique references public.loans(id) on delete restrict,
  kind text not null check (kind in ('lost', 'damaged')),
  reason text not null check (char_length(trim(reason)) between 2 and 240),
  charge_cents integer not null check (charge_cents between 0 and 10000000),
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.loan_incidents enable row level security;
revoke all on public.loan_incidents from anon, authenticated;
grant select on public.loan_incidents to authenticated;
create policy loan_incidents_select on public.loan_incidents for select to authenticated using (
  public.is_library_staff() or exists (select 1 from public.loans l where l.id = loan_id and l.member_id = auth.uid())
);
-- Incident-only assessments may have zero overdue days.
alter table public.fines drop constraint fines_overdue_days_check;
alter table public.fines add constraint fines_overdue_days_check check (overdue_days >= 0);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('due_soon','due_today','overdue','waitlist_joined','waitlist_ready','waitlist_expired','renewed','incident')),
  title text not null,
  message text not null,
  link text not null check (link in ('/borrowing','/reservations','/fines')),
  loan_id uuid references public.loans(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete cascade,
  dedup_key text not null unique,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_owner_time_idx on public.notifications(member_id, created_at desc);
create index notifications_unread_idx on public.notifications(member_id) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated using (member_id = (select auth.uid()));
create policy notifications_read on public.notifications for update to authenticated
  using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));

create function public.loan_reminder_kind(p_due_at timestamptz, p_now timestamptz) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_due_at <= p_now then 'overdue'
    when (p_due_at at time zone 'Asia/Manila')::date = (p_now at time zone 'Asia/Manila')::date then 'due_today'
    when p_due_at <= p_now + interval '72 hours' then 'due_soon'
    else null end;
$$;
revoke all on function public.loan_reminder_kind(timestamptz,timestamptz) from public, anon, authenticated;

create function public.reconcile_loan_notifications(p_member_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_loan record; v_kind text; v_key text;
begin
  -- Serialize per-recipient inbox refresh against the global cron pass.
  for v_loan in select l.*, b.title from public.loans l
    join public.book_copies c on c.id = l.copy_id join public.books b on b.id = c.book_id
    where p_member_id is null or l.member_id = p_member_id
    order by l.id for update of l
  loop
    v_kind := case when v_loan.status = 'active' then public.loan_reminder_kind(v_loan.due_at, now()) else null end;
    v_key := v_loan.id::text || ':' || extract(epoch from v_loan.due_at)::text || ':' || coalesce(v_kind,'none');
    delete from public.notifications where loan_id = v_loan.id and kind in ('due_soon','due_today','overdue') and dedup_key <> v_key;
    if v_kind is not null then
      insert into public.notifications(member_id,kind,title,message,link,loan_id,dedup_key)
      values(v_loan.member_id,v_kind,
        case v_kind when 'overdue' then 'Book overdue' when 'due_today' then 'Book due today' else 'Book due soon' end,
        format('%s is due %s (Philippine time).',v_loan.title,to_char(v_loan.due_at at time zone 'Asia/Manila','Mon DD, YYYY HH24:MI')),
        '/borrowing',v_loan.id,v_key) on conflict (dedup_key) do nothing;
    end if;
  end loop;
end;
$$;
revoke all on function public.reconcile_loan_notifications(uuid) from public, anon, authenticated;

create function public.refresh_my_notifications() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform public.reconcile_loan_notifications(auth.uid());
end;
$$;
revoke all on function public.refresh_my_notifications() from public, anon;
grant execute on function public.refresh_my_notifications() to authenticated;

create function public.notify_reservation_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_title text; v_kind text;
begin
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;
  select title into v_title from public.books where id = new.book_id;
  delete from public.notifications where reservation_id = new.id and kind in ('waitlist_joined','waitlist_ready');
  v_kind := case new.status when 'pending' then 'waitlist_joined' when 'ready' then 'waitlist_ready' when 'expired' then 'waitlist_expired' else null end;
  if v_kind is not null then
    insert into public.notifications(member_id,kind,title,message,link,reservation_id,dedup_key)
    values(new.member_id,v_kind,
      case new.status when 'pending' then 'You joined the waitlist' when 'ready' then 'Your book is ready' else 'Pickup window expired' end,
      case new.status when 'ready' then format('%s is ready. Collect it before %s (Philippine time).',v_title,to_char(new.ready_until at time zone 'Asia/Manila','Mon DD, YYYY HH24:MI'))
        when 'pending' then format('You are on the waitlist for %s. Check Reservations for your position.',v_title)
        else format('The pickup window for %s expired. You can join the waitlist again.',v_title) end,
      '/reservations',new.id,new.id::text || ':' || v_kind) on conflict (dedup_key) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_reservation_change() from public, anon, authenticated;
create trigger reservations_notify after insert or update of status on public.reservations
for each row execute function public.notify_reservation_change();

-- Existing waitlists also receive an inbox entry when this release is applied.
insert into public.notifications(member_id,kind,title,message,link,reservation_id,dedup_key)
select r.member_id,
  case r.status when 'ready' then 'waitlist_ready' else 'waitlist_joined' end,
  case r.status when 'ready' then 'Your book is ready' else 'You joined the waitlist' end,
  case r.status when 'ready' then format('%s is ready. Collect it before %s (Philippine time).',b.title,to_char(r.ready_until at time zone 'Asia/Manila','Mon DD, YYYY HH24:MI'))
    else format('You are on the waitlist for %s. Check Reservations for your position.',b.title) end,
  '/reservations',r.id,r.id::text || case r.status when 'ready' then ':waitlist_ready' else ':waitlist_joined' end
from public.reservations r join public.books b on b.id = r.book_id
where r.status = 'pending' or (r.status = 'ready' and r.ready_until > now())
on conflict (dedup_key) do nothing;

create function public.clear_closed_loan_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'active' or new.due_at <> old.due_at then
    delete from public.notifications where loan_id = new.id and kind in ('due_soon','due_today','overdue');
  end if;
  if new.status = 'returned' then new.closed_at := new.returned_at; end if;
  return new;
end;
$$;
revoke all on function public.clear_closed_loan_reminders() from public, anon, authenticated;
create trigger loans_clear_reminders before update on public.loans for each row execute function public.clear_closed_loan_reminders();

-- Full visibility of title waitlists is needed without exposing other students' reservations.
create function public.loan_renewal_context(p_loan_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_loan public.loans; v_copy public.book_copies; v_member public.profiles; v_balance bigint; v_threshold integer;
begin
  select * into v_loan from public.loans where id = p_loan_id;
  if not found then return null; end if;
  if auth.uid() is null or (v_loan.member_id <> auth.uid() and not public.is_library_staff()) then return null; end if;
  select * into v_copy from public.book_copies where id = v_loan.copy_id;
  select * into v_member from public.profiles where id = v_loan.member_id;
  select coalesce(sum(balance_cents),0) into v_balance from public.fines where member_id = v_loan.member_id;
  select borrowing_block_cents into v_threshold from public.fine_policy_config where singleton;
  return jsonb_build_object('memberId',v_loan.member_id,'status',v_loan.status,'dueAt',v_loan.due_at,'renewalCount',v_loan.renewal_count,
    'memberStatus',v_member.status,'outstandingCents',v_balance,'borrowingBlockCents',v_threshold,'copyStatus',v_copy.status,
    'hasWaitlist',exists(select 1 from public.reservations where book_id = v_copy.book_id and status in ('pending','ready')));
end;
$$;
revoke all on function public.loan_renewal_context(uuid) from public, anon;
grant execute on function public.loan_renewal_context(uuid) to authenticated;

create function public.renew_loan(p_loan_id uuid, p_expected_due_at timestamptz) returns public.loans
language plpgsql security definer set search_path = '' as $$
declare v_loan public.loans; v_book_id uuid; v_context jsonb;
begin
  select c.book_id into v_book_id from public.loans l join public.book_copies c on c.id = l.copy_id where l.id = p_loan_id;
  if not found then raise exception 'Loan not found' using errcode='P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_book_id::text, 240001));
  select * into v_loan from public.loans where id = p_loan_id for update;
  if auth.uid() is null or (v_loan.member_id <> auth.uid() and not public.is_library_staff()) then raise exception 'Loan access denied' using errcode='42501'; end if;
  perform 1 from public.profiles where id = v_loan.member_id for update;
  v_context := public.loan_renewal_context(p_loan_id);
  if v_loan.due_at is distinct from p_expected_due_at then raise exception 'Loan changed; refresh and try again' using errcode='23514'; end if;
  if v_loan.status <> 'active' or v_context->>'copyStatus' <> 'on_loan' then raise exception 'Only an active on-loan copy can be renewed' using errcode='23514'; end if;
  if v_loan.due_at <= now() then raise exception 'Overdue loans cannot be renewed' using errcode='23514'; end if;
  if v_loan.renewal_count >= 1 then raise exception 'This loan has already used its one renewal' using errcode='23514'; end if;
  if v_context->>'memberStatus' <> 'active' then raise exception 'Suspended members cannot renew loans' using errcode='23514'; end if;
  if (v_context->>'outstandingCents')::bigint >= (v_context->>'borrowingBlockCents')::integer then raise exception 'Reduce the outstanding fine balance before renewing' using errcode='23514'; end if;
  if (v_context->>'hasWaitlist')::boolean then raise exception 'This title has a waitlist and cannot be renewed' using errcode='23514'; end if;
  update public.loans set previous_due_at = due_at, due_at = due_at + interval '168 hours', renewal_count = 1, renewed_at = now(), renewed_by = auth.uid()
  where id = p_loan_id returning * into v_loan;
  insert into public.notifications(member_id,kind,title,message,link,loan_id,dedup_key)
  values(v_loan.member_id,'renewed','Loan renewed',format('Your new due date is %s (Philippine time).',to_char(v_loan.due_at at time zone 'Asia/Manila','Mon DD, YYYY HH24:MI')),
    '/borrowing',v_loan.id,v_loan.id::text || ':renewed');
  return v_loan;
end;
$$;
revoke all on function public.renew_loan(uuid,timestamptz) from public, anon;
grant execute on function public.renew_loan(uuid,timestamptz) to authenticated;

-- Serialize reservation creation with renewal before taking the member lock.
create or replace function public.create_reservation(p_book_id uuid) returns public.reservations
language plpgsql security definer set search_path = '' as $$
declare v_member public.profiles; v_reservation public.reservations;
begin
  if auth.uid() is null or public.current_app_role() <> 'student' then raise exception 'Only students can join a reservation waitlist' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_book_id::text, 240001));
  if not exists(select 1 from public.books where id = p_book_id and archived_at is null) then raise exception 'Book not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.book_copies where book_id = p_book_id) then raise exception 'This title has no physical copies to reserve' using errcode='23514'; end if;
  select * into v_member from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Member profile not found' using errcode='P0002'; end if;
  if v_member.status <> 'active' then raise exception 'Suspended members cannot reserve books' using errcode='23514'; end if;
  if exists(select 1 from public.book_copies where book_id = p_book_id and status = 'available') then raise exception 'This book has an available copy and does not need a reservation' using errcode='23514'; end if;
  if exists(select 1 from public.loans l join public.book_copies c on c.id = l.copy_id where l.member_id = auth.uid() and l.status = 'active' and c.book_id = p_book_id) then raise exception 'You already have an active loan for this book' using errcode='23514'; end if;
  insert into public.reservations(book_id,member_id) values(p_book_id,auth.uid()) returning * into v_reservation;
  return v_reservation;
exception when unique_violation then raise exception 'You already have an active reservation for this book' using errcode='23505';
end;
$$;

create function public.resolve_loan_incident(p_loan_id uuid,p_kind text,p_reason text,p_charge_cents integer,p_resolved_at timestamptz,p_overdue_fine_cents integer)
returns public.loans language plpgsql security definer set search_path = '' as $$
declare v_loan public.loans; v_policy public.fine_policy_config; v_days integer; v_overdue integer; v_total integer; v_title text;
begin
  if auth.uid() is null or not public.is_library_staff() then raise exception 'Staff role required' using errcode='42501'; end if;
  if p_kind is null or p_kind not in ('lost','damaged') or p_reason is null or char_length(trim(p_reason)) not between 2 and 240 or p_charge_cents is null or p_charge_cents not between 0 and 10000000 then raise exception 'Invalid incident details' using errcode='22023'; end if;
  if p_resolved_at is null or p_resolved_at not between now() - interval '5 minutes' and now() + interval '5 minutes' then raise exception 'Resolution timestamp is outside the allowed window' using errcode='22023'; end if;
  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found then raise exception 'Loan not found' using errcode='P0002'; end if;
  if v_loan.status <> 'active' then raise exception 'Loan is already closed' using errcode='23514'; end if;
  perform 1 from public.book_copies where id = v_loan.copy_id and status = 'on_loan' for update;
  if not found then raise exception 'Copy is not on loan' using errcode='23514'; end if;
  select * into strict v_policy from public.fine_policy_config where singleton;
  v_days := greatest(0,ceil(extract(epoch from (p_resolved_at - v_loan.due_at))/86400.0)::integer);
  v_overdue := least(v_policy.maximum_fine_cents::bigint,v_days::bigint * v_policy.daily_rate_cents)::integer;
  if p_overdue_fine_cents is distinct from v_overdue then raise exception 'Fine calculation changed; refresh and try again' using errcode='23514'; end if;
  v_total := v_overdue + p_charge_cents;
  update public.loans set status = case when p_kind = 'lost' then 'lost'::public.loan_status else 'returned'::public.loan_status end,
    returned_at = case when p_kind = 'damaged' then p_resolved_at else null end, closed_at = p_resolved_at
    where id = p_loan_id returning * into v_loan;
  update public.book_copies set status = case when p_kind = 'lost' then 'lost'::public.copy_status else 'maintenance'::public.copy_status end where id = v_loan.copy_id;
  insert into public.loan_incidents(loan_id,kind,reason,charge_cents,recorded_by,created_at) values(v_loan.id,p_kind,trim(p_reason),p_charge_cents,auth.uid(),p_resolved_at);
  if v_total > 0 then
    insert into public.fines(loan_id,member_id,overdue_days,original_amount_cents,balance_cents) values(v_loan.id,v_loan.member_id,v_days,v_total,v_total);
  end if;
  select b.title into v_title from public.books b join public.book_copies c on c.book_id = b.id where c.id = v_loan.copy_id;
  insert into public.notifications(member_id,kind,title,message,link,loan_id,dedup_key)
  values(v_loan.member_id,'incident','Book condition recorded',format('%s was recorded as %s. Reason: %s. Incident charge: PHP %s; overdue charge: PHP %s.',v_title,p_kind,trim(p_reason),to_char(p_charge_cents/100.0,'FM999999990.00'),to_char(v_overdue/100.0,'FM999999990.00')),
    case when v_total > 0 then '/fines' else '/borrowing' end,v_loan.id,v_loan.id::text || ':incident');
  return v_loan;
end;
$$;
revoke all on function public.resolve_loan_incident(uuid,text,text,integer,timestamptz,integer) from public, anon;
grant execute on function public.resolve_loan_incident(uuid,text,text,integer,timestamptz,integer) to authenticated;

-- Protect against bypassing circulation through the inventory editor.
create function public.guard_copy_circulation_state() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' and new.status in ('on_loan','reserved') then raise exception 'Use circulation to issue or reserve a copy' using errcode='23514'; end if;
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      if new.status in ('on_loan','reserved') or exists(select 1 from public.loans where copy_id = old.id and status = 'active') or exists(select 1 from public.reservations where assigned_copy_id = old.id and status = 'ready') then
        raise exception 'Use circulation to change an active or reserved copy' using errcode='23514';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_copy_circulation_state() from public, anon, authenticated;
create trigger copies_guard_circulation before insert or update of status on public.book_copies for each row execute function public.guard_copy_circulation_state();

create function public.offer_restored_copy() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'available' and exists(select 1 from public.reservations where book_id = new.book_id and status = 'pending') then
    if tg_op = 'INSERT' then perform public.assign_next_reservation(new.book_id,new.id);
    elsif old.status <> 'available' then perform public.assign_next_reservation(new.book_id,new.id); end if;
  end if;
  return new;
end;
$$;
revoke all on function public.offer_restored_copy() from public, anon, authenticated;
create trigger copies_offer_waitlist after insert or update of status on public.book_copies for each row execute function public.offer_restored_copy();

create function public.run_library_notifications() returns void
language plpgsql security definer set search_path = '' as $$
declare v_reservation public.reservations;
begin
  if not pg_catalog.pg_try_advisory_xact_lock(240002) then return; end if;
  for v_reservation in select * from public.reservations where status = 'ready' and ready_until <= now() order by ready_until,id for update skip locked
  loop
    update public.reservations set status = 'expired', assigned_copy_id = null where id = v_reservation.id;
    perform public.assign_next_reservation(v_reservation.book_id,v_reservation.assigned_copy_id);
  end loop;
  perform public.reconcile_loan_notifications();
end;
$$;
revoke all on function public.run_library_notifications() from public, anon, authenticated;

-- Supabase Cron runs without a browser session or an always-awake API server.
create extension if not exists pg_cron;
select cron.schedule('library-notifications','*/15 * * * *','select public.run_library_notifications()');
