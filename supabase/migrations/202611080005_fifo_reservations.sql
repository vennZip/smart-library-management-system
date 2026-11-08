-- Milestone 6: atomic FIFO reservations and pickup processing.
alter table public.reservations
  add column assigned_copy_id uuid references public.book_copies(id) on delete restrict;

alter table public.reservations
  add constraint ready_reservation_has_copy
  check (status <> 'ready' or assigned_copy_id is not null),
  add constraint inactive_reservation_has_no_copy
  check (status in ('ready', 'fulfilled') or assigned_copy_id is null);

create unique index one_ready_reservation_per_copy
  on public.reservations(assigned_copy_id) where status = 'ready';
create index reservations_fifo_idx
  on public.reservations(book_id, created_at, id) where status = 'pending';
create index reservations_ready_expiry_idx
  on public.reservations(ready_until) where status = 'ready';

-- Reservation state changes must go through the transaction-safe functions below.
revoke insert, update, delete on public.reservations from authenticated;

create or replace function public.assign_next_reservation(p_book_id uuid, p_copy_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations;
begin
  select * into v_reservation
  from public.reservations
  where book_id = p_book_id and status = 'pending'
  order by created_at, id
  for update skip locked
  limit 1;

  if found then
    update public.reservations
    set status = 'ready', assigned_copy_id = p_copy_id,
        ready_until = now() + interval '3 days'
    where id = v_reservation.id
    returning * into v_reservation;
    update public.book_copies set status = 'reserved' where id = p_copy_id;
  else
    update public.book_copies set status = 'available' where id = p_copy_id;
  end if;
  return v_reservation;
end;
$$;

revoke all on function public.assign_next_reservation(uuid, uuid) from public, anon, authenticated;

create or replace function public.create_reservation(p_book_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.profiles;
  v_reservation public.reservations;
begin
  if public.current_app_role() <> 'student' then
    raise exception 'Only students can join a reservation waitlist' using errcode = '42501';
  end if;
  if not exists (select 1 from public.books where id = p_book_id and archived_at is null) then
    raise exception 'Book not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.book_copies where book_id = p_book_id) then
    raise exception 'This title has no physical copies to reserve' using errcode = '23514';
  end if;
  select * into v_member from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Member profile not found' using errcode = 'P0002'; end if;
  if v_member.status <> 'active' then
    raise exception 'Suspended members cannot reserve books' using errcode = '23514';
  end if;
  if exists (select 1 from public.book_copies where book_id = p_book_id and status = 'available') then
    raise exception 'This book has an available copy and does not need a reservation' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.loans l join public.book_copies c on c.id = l.copy_id
    where l.member_id = auth.uid() and l.status = 'active' and c.book_id = p_book_id
  ) then
    raise exception 'You already have an active loan for this book' using errcode = '23514';
  end if;

  insert into public.reservations(book_id, member_id)
  values (p_book_id, auth.uid()) returning * into v_reservation;
  return v_reservation;
exception
  when unique_violation then
    raise exception 'You already have an active reservation for this book' using errcode = '23505';
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations;
  v_copy_id uuid;
begin
  select * into v_reservation from public.reservations
  where id = p_reservation_id for update;
  if not found then raise exception 'Reservation not found' using errcode = 'P0002'; end if;
  if v_reservation.member_id <> auth.uid() and not public.is_library_staff() then
    raise exception 'Reservation access denied' using errcode = '42501';
  end if;
  if v_reservation.status not in ('pending', 'ready') then
    raise exception 'Reservation is no longer active' using errcode = '23514';
  end if;
  v_copy_id := v_reservation.assigned_copy_id;
  update public.reservations
  set status = 'cancelled', assigned_copy_id = null, ready_until = null
  where id = p_reservation_id returning * into v_reservation;
  if v_copy_id is not null then
    perform public.assign_next_reservation(v_reservation.book_id, v_copy_id);
  end if;
  return v_reservation;
end;
$$;

create or replace function public.expire_ready_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations;
  v_count integer := 0;
begin
  if not public.is_library_staff() then
    raise exception 'Staff role required' using errcode = '42501';
  end if;
  for v_reservation in
    select * from public.reservations
    where status = 'ready' and ready_until <= now()
    order by ready_until, id for update skip locked
  loop
    update public.reservations
    set status = 'expired', assigned_copy_id = null
    where id = v_reservation.id;
    perform public.assign_next_reservation(v_reservation.book_id, v_reservation.assigned_copy_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.reservation_queue_position(p_reservation_id uuid)
returns integer
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations;
begin
  select * into v_reservation from public.reservations where id = p_reservation_id;
  if not found or (v_reservation.member_id <> auth.uid() and not public.is_library_staff()) then
    raise exception 'Reservation not found' using errcode = 'P0002';
  end if;
  if v_reservation.status = 'ready' then return 0; end if;
  if v_reservation.status <> 'pending' then return null; end if;
  return 1 + (
    select count(*)::integer from public.reservations r
    where r.book_id = v_reservation.book_id and r.status = 'pending'
      and (r.created_at, r.id) < (v_reservation.created_at, v_reservation.id)
  );
end;
$$;

-- Returning a copy immediately offers it to the oldest pending reservation.
create or replace function public.return_loan(p_loan_id uuid)
returns public.loans
language plpgsql
set search_path = ''
as $$
declare
  v_loan public.loans;
  v_copy public.book_copies;
begin
  if not public.is_library_staff() then raise exception 'Staff role required' using errcode='42501'; end if;
  select * into v_loan from public.loans where id=p_loan_id for update;
  if not found then raise exception 'Loan not found' using errcode='P0002'; end if;
  if v_loan.status <> 'active' then raise exception 'Loan is already returned' using errcode='23514'; end if;
  select * into v_copy from public.book_copies where id=v_loan.copy_id for update;
  if not found then raise exception 'Copy not found' using errcode='P0002'; end if;

  update public.loans set status='returned',returned_at=now()
  where id=p_loan_id returning * into v_loan;
  perform public.assign_next_reservation(v_copy.book_id, v_copy.id);
  return v_loan;
end;
$$;

-- A ready reservation may only be checked out to the member at the head of the queue.
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
    where assigned_copy_id = p_copy_id and member_id = p_member_id and status = 'ready'
    for update;
    if not found then raise exception 'This copy is reserved for another member' using errcode='23514'; end if;
    if v_reservation.ready_until <= now() then raise exception 'The pickup window has expired' using errcode='23514'; end if;
  end if;

  select * into v_member from public.profiles where id=p_member_id for update;
  if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  if v_member.status <> 'active' then raise exception 'Suspended members cannot borrow items' using errcode='23514'; end if;
  select count(*) into v_active_count from public.loans where member_id=p_member_id and status='active';
  if v_active_count >= 5 then raise exception 'Student loan limit reached' using errcode='23514'; end if;

  insert into public.loans(copy_id,member_id,issued_by,due_at)
  values(p_copy_id,p_member_id,auth.uid(),p_due_at) returning * into v_loan;
  update public.book_copies set status='on_loan' where id=p_copy_id;
  if v_reservation.id is not null then
    update public.reservations
    set status='fulfilled', fulfilled_at=now(), assigned_copy_id=p_copy_id
    where id=v_reservation.id;
  end if;
  return v_loan;
end;
$$;

revoke all on function public.create_reservation(uuid) from public, anon;
revoke all on function public.cancel_reservation(uuid) from public, anon;
revoke all on function public.expire_ready_reservations() from public, anon;
revoke all on function public.reservation_queue_position(uuid) from public, anon;
grant execute on function public.create_reservation(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.expire_ready_reservations() to authenticated;
grant execute on function public.reservation_queue_position(uuid) to authenticated;
