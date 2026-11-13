# Safe role-based demonstration scenarios

Use a designated demo Supabase project or records approved for demonstration. Never expose passwords on slides, in Git, or in screenshots. Keep three accounts whose roles live in server-controlled `app_metadata`: one admin, one librarian, and one student.

## Preparation

1. Apply every migration and confirm Vercel and Render show the submission commit.
2. Create the three demo Auth users and matching profiles. Confirm each can sign in before presentation day.
3. Add two ordinary catalog titles with at least two available copies. Use barcodes beginning with `DEMO-`.
4. Keep one title available and one title unavailable so reservation behavior is easy to show.
5. Record starting IDs and states. Do not use real student information.

## Student scenario: self-service account

Target time: 2 minutes.

1. Sign in as the student and point out that staff-only navigation is absent.
2. Search the catalog and open a book to show calculated copy availability.
3. Open Borrowing to show that RLS returns only this student's history.
4. Reserve the unavailable demo title and show its FIFO queue position.
5. Open Fines to show the student's read-only ledger.

Evidence to explain: frontend route guards improve UX, while Express authorization and RLS are the actual security controls.

## Librarian scenario: circulation workflow

Target time: 3 minutes.

1. Sign in as librarian and issue an available `DEMO-` barcode to the demo student.
2. Show the automatic copy transition from `available` to `on_loan`.
3. Return the copy and explain that one database function closes the loan, calculates any fine, and assigns the oldest reservation atomically.
4. Open Reservations and show ready/pending states and pickup deadlines.
5. Open the DSA Evidence Lab and run one HashSet, tree, graph, and array demonstration.

Evidence to explain: services apply OOP policies before repositories invoke database operations; PostgreSQL repeats critical invariants under locks.

## Admin scenario: governance and evidence

Target time: 2 minutes.

1. Sign in as admin and open Admin Analytics.
2. Explain that aggregates are read-only and calculated from persistent records.
3. Make one approved catalog edit, refresh Analytics, and show the append-only audit event.
4. Show the request ID in a failed API response or Render structured log.
5. Return the demo record to its starting state through the UI so the restoration is audited too.

## Reset checklist

- Return any active demo loans.
- Cancel remaining demo reservations through the application.
- Restore edited catalog text through the application.
- Keep audit records; they are evidence and intentionally cannot be edited by authenticated clients.
- Do not manually delete historical loans, fines, payments, or audit rows.

## Failure fallback

If Render is waking up, open `/api/health` first and allow it to respond before the live demo. Keep screenshots of the three role views, DSA Lab, Analytics, and Supabase tables as backup evidence. If the network fails, run the client and server locally against the same Supabase project and clearly state that only hosting changed—not application behavior.
