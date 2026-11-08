-- Allow staff to remove only copies that remain unreferenced by circulation records.
-- The loans.copy_id foreign key uses ON DELETE RESTRICT as a final integrity guard.
grant delete on public.book_copies to authenticated;

create policy copies_delete_staff on public.book_copies
for delete to authenticated
using ((select public.is_library_staff()));
