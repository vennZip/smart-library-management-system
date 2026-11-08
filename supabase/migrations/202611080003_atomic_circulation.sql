-- Milestone 5: member state plus atomic checkout and return operations.
create type public.member_status as enum ('active', 'suspended');

alter table public.profiles add column email text;
alter table public.profiles add column status public.member_status not null default 'active';
update public.profiles p set email=u.email from auth.users u where u.id=p.id;
alter table public.profiles alter column email set not null;
create unique index profiles_email_lower_unique on public.profiles(lower(email));
create index profiles_status_idx on public.profiles(status);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email, display_name)
  values (new.id, new.email, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

-- Users may edit display data, but never their own suspension state.
revoke update on public.profiles from authenticated;
grant update(display_name) on public.profiles to authenticated;

-- Students retain access to bibliographic details for their own loan history,
-- even if staff later archive the catalog record.
create policy books_select_own_loan_history on public.books
for select to authenticated
using (
  exists (
    select 1
    from public.book_copies c
    join public.loans l on l.copy_id = c.id
    where c.book_id = books.id and l.member_id = (select auth.uid())
  )
);

create or replace function public.issue_loan(p_copy_id uuid,p_member_id uuid,p_due_at timestamptz)
returns public.loans
language plpgsql
set search_path = ''
as $$
declare
  v_copy public.book_copies;
  v_member public.profiles;
  v_active_count integer;
  v_loan public.loans;
begin
  if not public.is_library_staff() then raise exception 'Staff role required' using errcode='42501'; end if;
  if p_due_at <= now() then raise exception 'Due date must be in the future' using errcode='22023'; end if;

  select * into v_copy from public.book_copies where id=p_copy_id for update;
  if not found then raise exception 'Copy not found' using errcode='P0002'; end if;
  if v_copy.status <> 'available' then raise exception 'Copy is not available' using errcode='23514'; end if;

  select * into v_member from public.profiles where id=p_member_id for update;
  if not found then raise exception 'Member not found' using errcode='P0002'; end if;
  if v_member.status <> 'active' then raise exception 'Suspended members cannot borrow items' using errcode='23514'; end if;
  select count(*) into v_active_count from public.loans where member_id=p_member_id and status='active';
  if v_active_count >= 5 then raise exception 'Student loan limit reached' using errcode='23514'; end if;

  insert into public.loans(copy_id,member_id,issued_by,due_at)
  values(p_copy_id,p_member_id,auth.uid(),p_due_at) returning * into v_loan;
  update public.book_copies set status='on_loan' where id=p_copy_id;
  return v_loan;
end;
$$;

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

  update public.loans set status='returned',returned_at=now() where id=p_loan_id returning * into v_loan;
  update public.book_copies set status='available' where id=v_loan.copy_id;
  return v_loan;
end;
$$;

revoke all on function public.issue_loan(uuid,uuid,timestamptz) from public,anon;
revoke all on function public.return_loan(uuid) from public,anon;
grant execute on function public.issue_loan(uuid,uuid,timestamptz) to authenticated;
grant execute on function public.return_loan(uuid) to authenticated;
