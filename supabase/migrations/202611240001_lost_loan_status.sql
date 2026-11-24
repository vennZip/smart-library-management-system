-- Commit this migration before the next one uses the new enum value.
alter type public.loan_status add value if not exists 'lost';
