-- Milestone 3: core library schema. Apply with `supabase db push` or the SQL editor.
create extension if not exists pgcrypto with schema extensions;

create type public.copy_status as enum ('available', 'on_loan', 'reserved', 'lost', 'maintenance');
create type public.loan_status as enum ('active', 'returned');
create type public.reservation_status as enum ('pending', 'ready', 'fulfilled', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  isbn text not null unique check (isbn ~ '^[0-9Xx-]{10,17}$'),
  title text not null check (char_length(trim(title)) between 1 and 240),
  author text not null check (char_length(trim(author)) between 1 and 180),
  publisher text,
  publication_year integer check (publication_year between 1000 and 2200),
  category text not null check (char_length(trim(category)) between 1 and 80),
  description text,
  cover_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.book_copies (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  barcode text not null unique check (char_length(trim(barcode)) between 3 and 64),
  shelf_location text not null check (char_length(trim(shelf_location)) between 1 and 80),
  status public.copy_status not null default 'available',
  acquired_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  copy_id uuid not null references public.book_copies(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete restrict,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  borrowed_at timestamptz not null default now(),
  due_at timestamptz not null,
  returned_at timestamptz,
  status public.loan_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint loan_due_after_borrowed check (due_at > borrowed_at),
  constraint returned_loan_is_consistent check (
    (status = 'active' and returned_at is null) or
    (status = 'returned' and returned_at is not null and returned_at >= borrowed_at)
  )
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete cascade,
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  ready_until timestamptz,
  fulfilled_at timestamptz,
  constraint ready_reservation_has_expiry check (status <> 'ready' or ready_until is not null),
  constraint fulfilled_reservation_has_date check (status <> 'fulfilled' or fulfilled_at is not null)
);

create unique index one_open_reservation_per_member_book
  on public.reservations(book_id, member_id)
  where status in ('pending', 'ready');
create unique index one_active_loan_per_copy on public.loans(copy_id) where status = 'active';
create index books_title_lower_idx on public.books(lower(title));
create index books_author_lower_idx on public.books(lower(author));
create index books_category_idx on public.books(category) where archived_at is null;
create index book_copies_book_id_idx on public.book_copies(book_id);
create index book_copies_status_idx on public.book_copies(status);
create index loans_member_id_idx on public.loans(member_id);
create index loans_due_at_active_idx on public.loans(due_at) where status = 'active';
create index reservations_member_id_idx on public.reservations(member_id);
create index reservations_book_status_idx on public.reservations(book_id, status);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger books_set_updated_at before update on public.books
for each row execute function public.set_updated_at();
create trigger book_copies_set_updated_at before update on public.book_copies
for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create function public.current_app_role() returns text
language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), 'student');
$$;
create function public.is_library_staff() returns boolean
language sql stable set search_path = '' as $$
  select public.current_app_role() in ('admin', 'librarian');
$$;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_copies enable row level security;
alter table public.loans enable row level security;
alter table public.reservations enable row level security;

revoke all on public.profiles, public.books, public.book_copies, public.loans, public.reservations from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.books to authenticated;
grant select, insert, update on public.book_copies to authenticated;
grant select, insert, update on public.loans to authenticated;
grant select, insert, update, delete on public.reservations to authenticated;

create policy profiles_select on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select public.is_library_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy books_select on public.books for select to authenticated
using (archived_at is null or (select public.is_library_staff()));
create policy books_insert_staff on public.books for insert to authenticated
with check ((select public.is_library_staff()));
create policy books_update_staff on public.books for update to authenticated
using ((select public.is_library_staff())) with check ((select public.is_library_staff()));

create policy copies_select on public.book_copies for select to authenticated using (true);
create policy copies_insert_staff on public.book_copies for insert to authenticated
with check ((select public.is_library_staff()));
create policy copies_update_staff on public.book_copies for update to authenticated
using ((select public.is_library_staff())) with check ((select public.is_library_staff()));

create policy loans_select on public.loans for select to authenticated
using (member_id = (select auth.uid()) or (select public.is_library_staff()));
create policy loans_insert_staff on public.loans for insert to authenticated
with check ((select public.is_library_staff()));
create policy loans_update_staff on public.loans for update to authenticated
using ((select public.is_library_staff())) with check ((select public.is_library_staff()));

create policy reservations_select on public.reservations for select to authenticated
using (member_id = (select auth.uid()) or (select public.is_library_staff()));
create policy reservations_insert_own on public.reservations for insert to authenticated
with check (member_id = (select auth.uid()));
create policy reservations_update_staff on public.reservations for update to authenticated
using ((select public.is_library_staff())) with check ((select public.is_library_staff()));
create policy reservations_delete_own_or_staff on public.reservations for delete to authenticated
using (member_id = (select auth.uid()) or (select public.is_library_staff()));

-- Backfill profiles for users created before this migration.
insert into public.profiles(id, display_name)
select id, coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), split_part(email, '@', 1))
from auth.users on conflict (id) do nothing;
