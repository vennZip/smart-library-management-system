-- PostgreSQL requires a newly-added enum value to be committed before it is used.
alter type public.reservation_status add value if not exists 'expired';
