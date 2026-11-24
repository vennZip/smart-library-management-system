# Notifications, renewals, and copy incidents

Requirements designed before schema/workflow implementation. The user selected in-app notifications and the renewal/charge rules on 24 November 2026.

## In-app notifications

- Each user has a private persistent inbox, an unread counter, and mark-read actions. Staff cannot read another user's inbox.
- Loan reminders: once within three days of the due timestamp, once on its due calendar date in Asia/Manila, and once after it becomes overdue. The latest stage supersedes earlier loan reminders. The deduplication key includes the loan's due timestamp so a renewal starts a new reminder cycle.
- Waitlists: confirmation when joined, notice when a copy is ready with its exact pickup deadline, and expiry notice. Notifications for earlier waitlist stages are removed when no longer actionable. Queue-position changes are visible on Reservations rather than generating a notice for each change.
- Waitlist events create notices transactionally. A database job processes due reminders and expired pickups every 15 minutes, even when the API is asleep. Inbox refresh also reconciles the current user's reminders. The UI polls unread count every 60 seconds while visible and refreshes on focus.
- No external email or browser push is included. No new application credentials are needed.

## Renewal

- Students renew their own active loans; librarians/admins may renew a member's loan.
- One renewal per loan, extending the existing due timestamp by seven 24-hour days. Renewal is allowed strictly before the due timestamp.
- Reject renewal if the member is suspended, the balance reaches the existing borrowing-block threshold, the copy is not on loan, or any pending/ready reservation exists for the title.
- The application policy validates eligibility; a locked database transaction repeats every rule. Title-level advisory locks serialize renewal against reservation creation. The loan row serializes simultaneous renewal/return/incident operations.
- Preserve renewal count, timestamp, actor, old due date, and new due date. Notify the borrower of the new date and invalidate old reminders.

## Lost/damaged handling

- Only staff may resolve an active loan as lost or damaged. A trimmed reason (2–240 characters) and a nonnegative integer charge in centavos (maximum PHP 100,000) are required; zero represents no incident charge.
- A lost loan closes as `lost`, with a closure timestamp and no physical return timestamp. Its copy becomes `lost`. A damaged loan closes as `returned`, records a physical return timestamp, and its copy becomes `maintenance`.
- Both outcomes stop overdue accrual at resolution time and preserve loan history. Neither offers the unavailable copy to the waitlist. Staff may restore a repaired/found copy through inventory; available restored copies are offered to the oldest waitlist entry.
- Existing overdue charges remain applicable and are calculated by the configured fine policy. An incident charge is added to the same loan's fine balance, with its reason retained in the immutable incident record. Financial payment/adjustment workflows remain in Fines.
- Resolution, copy state, overdue assessment, incident charge, incident record, and borrower notification commit together. A second resolution fails without creating another charge.
- Copy edits cannot change circulation state for an active loan or assigned reservation; staff must use the circulation workflow.

## Persistence and boundaries

New persistence: notifications, loan incident records, renewal metadata, and a `lost` loan status. Incident records are staff-created and readable by the borrower/staff; notifications are owner-only. New RPCs authorize from the signed JWT and use a fixed empty search path. Domain policies/services own application decisions; repositories encapsulate Supabase calls; routes translate HTTP.

Apply the two new migrations in filename order. The enum migration must commit before functions use the new enum value. The workflow migration enables pg_cron and installs the 15-minute job using Supabase Cron: https://supabase.com/docs/guides/cron. Migration application and production deployment are separate from preparing source changes.

## Verification

Cover renewal boundaries and authorization, simultaneous/duplicate resolution protection, invalid incident inputs, notification ownership/mark-read, stale reminder suppression, role-protected HTTP endpoints, and accessible UI interactions. Database regression SQL runs in an isolated test database with all migrations applied. Run `npm run check` from the repository root.

The database regression runner (`npm run test:database`) uses an ephemeral PGlite PostgreSQL engine. It applies every migration in order, exercises real RLS, grants, triggers, constraints, and RPC transactions, and invokes scheduled work explicitly. Supabase identity helpers and cron job registration are test adapters. Actual scheduler timing, JWT verification, PostgREST relationship embedding, and independent concurrent database sessions require verification in the demo Supabase project. No live project or real notifications are touched by these tests.

Class relationships: `LoanLifecycleService` depends on the `RenewalPolicy` contract, implemented by `StandardRenewalPolicy`, and on `LoanLifecycleRepository`. `LoanIncident` encapsulates validated condition, reason, and integer charge; callers receive independent snapshots. Existing `StandardOverdueFinePolicy` calculates the overdue portion independently of the incident charge. Policy and service behavior are tested through public APIs in `loan-lifecycle.service.test.ts`.

## Release and demonstration

1. Install root development dependencies (`npm install`, or `npm.cmd install` in Windows PowerShell) and run `npm run check`.
2. Apply `202611240001_lost_loan_status.sql`, commit, then apply `202611240002_notifications_renewals_incidents.sql` in the intended Supabase project. The latter enables pg_cron and registers the named job. Deploy the backend/frontend only after the migrations succeed; older schemas do not contain the newly selected columns and relationships.
3. In Supabase SQL Editor, verify `select jobname,schedule,active from cron.job where jobname='library-notifications';`. Inspect recent `cron.job_run_details` for successful executions. See [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart).
4. With demo records, open Notifications as a borrower, verify the unread badge, mark a notice read, and confirm it remains read after refresh. Check the inbox as another user to verify privacy.
5. Renew an eligible loan, confirm the due date advances seven days and the renewal count is one. Verify a second attempt and an attempt for a waitlisted title fail.
6. As staff, record a damaged return with a reason and a charge. Verify maintenance status and the original assessment/incident breakdown in Fines. Restore the repaired copy through inventory and verify the oldest waiter receives a pickup notice.
7. Record another demo loan as lost. Verify it stops counting as active, retains no physical return date, retains the incident reason, and never offers its copy to the waitlist. Verify payments and adjustments still work for its assessment.

The inbox contains at most the newest 100 matching notices; the unread count covers the whole inbox and mark-all-read applies to all unread notices. Waitlist order is enforced by the existing database queue; notification creation does not reorder it.

## Recorded local verification — 24 November 2026

`npm.cmd run check` passed: client ESLint, client/server TypeScript and production builds, 11 frontend tests, 88 backend tests, smoke-runner syntax, and 13 database regression tests (112 tests total). `git diff --check` passed. This record covers local implementation; the live release checks above remain pending until migrations and deployments are applied.
