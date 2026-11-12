-- Safe, repeatable demonstration catalog data. Run only in a demo/local project.
-- Authentication users, loans, reservations, fines, and payments are intentionally excluded.
insert into public.books(isbn,title,author,publisher,publication_year,category,description)
values
  ('978-0132350884','Clean Code','Robert C. Martin','Prentice Hall',2008,'Software Engineering','A practical reference for readable and maintainable software.'),
  ('978-0321125217','Domain-Driven Design','Eric Evans','Addison-Wesley',2003,'Software Engineering','Strategic and tactical patterns for complex business domains.'),
  ('978-0262033848','Introduction to Algorithms','Thomas H. Cormen et al.','MIT Press',2009,'Computer Science','A comprehensive algorithms and data structures reference.')
on conflict (isbn) do update set title=excluded.title,author=excluded.author,publisher=excluded.publisher,publication_year=excluded.publication_year,category=excluded.category,description=excluded.description;

insert into public.book_copies(book_id,barcode,shelf_location,status,acquired_at)
select id,'DEMO-SE-0001','SE-A01','available',current_date from public.books where isbn='978-0132350884'
on conflict (barcode) do nothing;
insert into public.book_copies(book_id,barcode,shelf_location,status,acquired_at)
select id,'DEMO-SE-0002','SE-A02','available',current_date from public.books where isbn='978-0321125217'
on conflict (barcode) do nothing;
insert into public.book_copies(book_id,barcode,shelf_location,status,acquired_at)
select id,'DEMO-CS-0001','CS-B01','maintenance',current_date from public.books where isbn='978-0262033848'
on conflict (barcode) do nothing;
