-- Milestone 9: append-only staff audit evidence.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('admin', 'librarian')),
  request_id uuid not null,
  action text not null check (char_length(action) between 3 and 80),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id text,
  method text not null check (method in ('POST', 'PATCH', 'PUT', 'DELETE')),
  path text not null check (char_length(path) between 1 and 500),
  status_code integer not null check (status_code between 200 and 399),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index audit_logs_actor_created_idx on public.audit_logs(actor_id,created_at desc);
create index audit_logs_action_idx on public.audit_logs(action);
create index audit_logs_entity_idx on public.audit_logs(entity_type,entity_id) where entity_id is not null;

alter table public.audit_logs enable row level security;
create policy audit_logs_select_staff on public.audit_logs for select to authenticated
using (public.is_library_staff());
create policy audit_logs_insert_staff on public.audit_logs for insert to authenticated
with check (public.is_library_staff() and actor_id=auth.uid() and actor_role=(auth.jwt()->'app_metadata'->>'role'));

revoke update,delete,truncate on public.audit_logs from authenticated;
grant select,insert on public.audit_logs to authenticated;

comment on table public.audit_logs is 'Append-only evidence of successful staff mutations; request bodies and credentials are deliberately excluded.';
