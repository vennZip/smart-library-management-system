-- Milestone 7: persistent overdue fines, immutable ledger entries, and atomic payments.
create type public.fine_status as enum ('open', 'settled');
create type public.fine_transaction_type as enum ('payment', 'adjustment');

create table public.fine_policy_config (
  singleton boolean primary key default true check (singleton),
  daily_rate_cents integer not null check (daily_rate_cents > 0),
  maximum_fine_cents integer not null check (maximum_fine_cents >= daily_rate_cents),
  borrowing_block_cents integer not null check (borrowing_block_cents > 0),
  updated_at timestamptz not null default now()
);

insert into public.fine_policy_config(daily_rate_cents, maximum_fine_cents, borrowing_block_cents)
values (1000, 50000, 50000);

create table public.fines (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null unique references public.loans(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete restrict,
  overdue_days integer not null check (overdue_days > 0),
  original_amount_cents integer not null check (original_amount_cents > 0),
  balance_cents integer not null check (balance_cents >= 0),
  status public.fine_status not null default 'open',
  assessed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fine_status_balance_consistent check (
    (status = 'open' and balance_cents > 0) or
    (status = 'settled' and balance_cents = 0)
  )
);

create table public.fine_transactions (
  id uuid primary key default gen_random_uuid(),
  fine_id uuid not null references public.fines(id) on delete restrict,
  type public.fine_transaction_type not null,
  amount_cents integer not null check (amount_cents <> 0),
  note text not null check (char_length(trim(note)) between 2 and 240),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint payment_is_negative check (type <> 'payment' or amount_cents < 0)
);

create index fines_member_status_idx on public.fines(member_id, status);
create index fines_assessed_at_idx on public.fines(assessed_at desc);
create index fine_transactions_fine_created_idx on public.fine_transactions(fine_id, created_at);

alter table public.fine_policy_config enable row level security;
alter table public.fines enable row level security;
alter table public.fine_transactions enable row level security;
revoke all on public.fine_policy_config, public.fines, public.fine_transactions from anon;
grant select on public.fine_policy_config, public.fines, public.fine_transactions to authenticated;

create policy fine_policy_select on public.fine_policy_config for select to authenticated using (true);
create policy fines_select on public.fines for select to authenticated
using (member_id = (select auth.uid()) or (select public.is_library_staff()));
create policy fine_transactions_select on public.fine_transactions for select to authenticated
using (exists (
  select 1 from public.fines f
  where f.id = fine_transactions.fine_id
    and (f.member_id = (select auth.uid()) or (select public.is_library_staff()))
));

create trigger fines_set_updated_at before update on public.fines
for each row execute function public.set_updated_at();

-- Replaces the one-argument return function. The caller supplies the OOP policy
-- result, and PostgreSQL independently verifies it before closing the loan.
drop function public.return_loan(uuid);
create function public.return_loan(
  p_loan_id uuid,
  p_returned_at timestamptz,
  p_fine_amount_cents integer
)
returns public.loans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loan public.loans;
  v_copy public.book_copies;
  v_policy public.fine_policy_config;
  v_overdue_days integer;
  v_expected_fine integer;
begin
  if not public.is_library_staff() then raise exception 'Staff role required' using errcode='42501'; end if;
  if p_returned_at > now() + interval '5 minutes' or p_returned_at < now() - interval '5 minutes' then
    raise exception 'Return timestamp is outside the allowed processing window' using errcode='22023';
  end if;
  select * into v_loan from public.loans where id=p_loan_id for update;
  if not found then raise exception 'Loan not found' using errcode='P0002'; end if;
  if v_loan.status <> 'active' then raise exception 'Loan is already returned' using errcode='23514'; end if;
  select * into v_copy from public.book_copies where id=v_loan.copy_id for update;
  if not found then raise exception 'Copy not found' using errcode='P0002'; end if;
  select * into v_policy from public.fine_policy_config where singleton;
  v_overdue_days := greatest(0, ceil(extract(epoch from (p_returned_at - v_loan.due_at)) / 86400.0)::integer);
  v_expected_fine := least(v_policy.maximum_fine_cents, v_overdue_days * v_policy.daily_rate_cents);
  if p_fine_amount_cents <> v_expected_fine then
    raise exception 'Fine calculation does not match the active policy' using errcode='23514';
  end if;

  update public.loans set status='returned',returned_at=p_returned_at
  where id=p_loan_id returning * into v_loan;
  if v_expected_fine > 0 then
    insert into public.fines(loan_id, member_id, overdue_days, original_amount_cents, balance_cents)
    values(v_loan.id, v_loan.member_id, v_overdue_days, v_expected_fine, v_expected_fine);
  end if;
  perform public.assign_next_reservation(v_copy.book_id, v_copy.id);
  return v_loan;
end;
$$;

-- Preserve reservation checkout while adding a database-enforced balance block.
create or replace function public.issue_loan(p_copy_id uuid,p_member_id uuid,p_due_at timestamptz)
returns public.loans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_copy public.book_copies;
  v_member public.profiles;
  v_active_count integer;
  v_balance integer;
  v_block_threshold integer;
  v_loan public.loans;
  v_reservation public.reservations;
begin
  if not public.is_library_staff() then raise exception 'Staff role required' using errcode='42501'; end if;
  if p_due_at <= now() then raise exception 'Due date must be in the future' using errcode='22023'; end if;
  select * into v_copy from public.book_copies where id=p_copy_id for update;
  if not found then raise exception 'Copy not found' using errcode='P0002'; end if;
  if v_copy.status not in ('available', 'reserved') then raise exception 'Copy is not available' using errcode='23514'; end if;
  if v_copy.status = 'reserved' then
    select * into v_reservation from public.reservations
    where assigned_copy_id=p_copy_id and member_id=p_member_id and status='ready' for update;
    if not found then raise exception 'This copy is reserved for another member' using errcode='23514'; end if;
    if v_reservation.ready_until <= now() then raise exception 'The pickup window has expired' using errcode='23514'; end if;
  end if;
  select * into v_member from public.profiles where id=p_member_id for update;
  if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  if v_member.status <> 'active' then raise exception 'Suspended members cannot borrow items' using errcode='23514'; end if;
  select count(*) into v_active_count from public.loans where member_id=p_member_id and status='active';
  if v_active_count >= 5 then raise exception 'Student loan limit reached' using errcode='23514'; end if;
  select coalesce(sum(balance_cents),0) into v_balance from public.fines where member_id=p_member_id and status='open';
  select borrowing_block_cents into v_block_threshold from public.fine_policy_config where singleton;
  if v_balance >= v_block_threshold then
    raise exception 'Outstanding fine balance must be reduced before borrowing' using errcode='23514';
  end if;
  insert into public.loans(copy_id,member_id,issued_by,due_at)
  values(p_copy_id,p_member_id,auth.uid(),p_due_at) returning * into v_loan;
  update public.book_copies set status='on_loan' where id=p_copy_id;
  if v_reservation.id is not null then
    update public.reservations set status='fulfilled',fulfilled_at=now(),assigned_copy_id=p_copy_id
    where id=v_reservation.id;
  end if;
  return v_loan;
end;
$$;

create function public.record_fine_payment(p_fine_id uuid,p_amount_cents integer,p_note text)
returns public.fines
language plpgsql
security definer
set search_path = ''
as $$
declare v_fine public.fines;
begin
  if not public.is_library_staff() then raise exception 'Staff role required' using errcode='42501'; end if;
  if p_amount_cents <= 0 then raise exception 'Payment must be positive' using errcode='22023'; end if;
  if char_length(trim(p_note)) not between 2 and 240 then raise exception 'Payment note must contain 2 to 240 characters' using errcode='22023'; end if;
  select * into v_fine from public.fines where id=p_fine_id for update;
  if not found then raise exception 'Fine not found' using errcode='P0002'; end if;
  if p_amount_cents > v_fine.balance_cents then raise exception 'Payment exceeds the outstanding balance' using errcode='23514'; end if;
  insert into public.fine_transactions(fine_id,type,amount_cents,note,recorded_by)
  values(p_fine_id,'payment',-p_amount_cents,trim(p_note),auth.uid());
  update public.fines set balance_cents=balance_cents-p_amount_cents,
    status=case when balance_cents-p_amount_cents=0 then 'settled'::public.fine_status else 'open'::public.fine_status end
  where id=p_fine_id returning * into v_fine;
  return v_fine;
end;
$$;

create function public.record_fine_adjustment(p_fine_id uuid,p_amount_cents integer,p_note text)
returns public.fines
language plpgsql
security definer
set search_path = ''
as $$
declare v_fine public.fines;
begin
  if not public.is_library_staff() then raise exception 'Staff role required' using errcode='42501'; end if;
  if p_amount_cents = 0 then raise exception 'Adjustment cannot be zero' using errcode='22023'; end if;
  if char_length(trim(p_note)) not between 2 and 240 then raise exception 'Adjustment reason must contain 2 to 240 characters' using errcode='22023'; end if;
  select * into v_fine from public.fines where id=p_fine_id for update;
  if not found then raise exception 'Fine not found' using errcode='P0002'; end if;
  if v_fine.balance_cents+p_amount_cents < 0 then raise exception 'Adjustment would create a negative balance' using errcode='23514'; end if;
  insert into public.fine_transactions(fine_id,type,amount_cents,note,recorded_by)
  values(p_fine_id,'adjustment',p_amount_cents,trim(p_note),auth.uid());
  update public.fines set balance_cents=balance_cents+p_amount_cents,
    status=case when balance_cents+p_amount_cents=0 then 'settled'::public.fine_status else 'open'::public.fine_status end
  where id=p_fine_id returning * into v_fine;
  return v_fine;
end;
$$;

revoke all on function public.return_loan(uuid,timestamptz,integer) from public,anon;
revoke all on function public.record_fine_payment(uuid,integer,text) from public,anon;
revoke all on function public.record_fine_adjustment(uuid,integer,text) from public,anon;
grant execute on function public.return_loan(uuid,timestamptz,integer) to authenticated;
grant execute on function public.record_fine_payment(uuid,integer,text) to authenticated;
grant execute on function public.record_fine_adjustment(uuid,integer,text) to authenticated;
