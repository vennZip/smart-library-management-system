# Smart Library Borrowing and Management System

A university final project combining an accessible library operations interface with deliberate OOP and DSA implementations. Milestone 7 adds OOP-based overdue assessment, persistent fine ledgers, atomic payments and adjustments, and balance-based borrowing restrictions. The assessed DSA features remain intentionally out of scope.

## Stack

- Client: React, Vite, TypeScript, React Router, Tailwind CSS
- Server: Node.js, Express, TypeScript
- Platform: Supabase Auth and PostgreSQL with Row Level Security

## Architecture

```text
client/src/
  auth/             session context, role parsing, and route guards
  components/       reusable presentation and layout components
  data/             temporary UI-only placeholder data
  lib/              external clients such as Supabase
  pages/            route-level screens
supabase/migrations/ versioned PostgreSQL schema and RLS policies
server/src/
  auth/             verified Supabase identity and shared role types
  domain/           encapsulated library entities and policy abstractions
  middleware/       authentication and role authorization
  repositories/     Supabase persistence behind interfaces
  routes/           HTTP paths, status codes, and responses
  services/         business logic and domain orchestration
  app.ts            middleware and route composition
  server.ts         process startup only
```

The server follows a route-to-service boundary. Borrowing rules belong in services/domain classes, not React components or Express route handlers. No service-role key is needed for this milestone and one must never be exposed to the client.

## Setup and test

1. Run `npm install` inside both `client` and `server`.
2. Copy `client/.env.example` to `client/.env.local`; add Supabase browser credentials and `VITE_API_URL`.
3. Copy `server/.env.example` to `server/.env`. Use the same Supabase URL and publishable key.
4. In separate terminals run `npm run dev:server` and `npm run dev:client` from the repository root.
5. Open `http://localhost:5173`. Check `http://localhost:3000/api/health` for JSON status.
6. Run `npm run check` for lint, builds, type checking, API authorization tests, and OOP tests.

## Apply the database migration

The migrations create the library foundation, physical-copy protections, atomic circulation, and FIFO reservation workflow. Apply every pending migration in timestamp order. The reservation enum addition is intentionally separate from the migration that uses it because PostgreSQL requires the new value to be committed first.

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Alternatively, paste the complete migration into the Supabase SQL Editor and run it once. Do not rerun it after it succeeds because the enum and table creation statements are intentionally versioned, not idempotent.

For Vercel, set `VITE_API_URL` to the Render service origin, such as `https://your-api.onrender.com`, and redeploy. Keep the local value as `http://localhost:3000`. Render's `CLIENT_ORIGIN` must exactly match the Vercel production origin.

Vite proxies `/api` requests to port 3000 during development. Express permits the configured `CLIENT_ORIGIN` (default `http://localhost:5173`) through CORS.

## Authentication and roles

The browser uses Supabase email/password Auth and listens for session changes. Protected API requests must send `Authorization: Bearer <access-token>`. Express validates that token with Supabase before reading `app_metadata.role`; it never accepts a role from the request body. Supported roles are `admin`, `librarian`, and `student`. A missing or invalid role becomes the least-privileged `student` role.

Create test users through Supabase Authentication and assign server-controlled app metadata such as `{ "role": "librarian" }` using the Supabase dashboard or Admin API. Members and Reports are staff-only. Frontend guards improve navigation, while Express authorization and database RLS provide the security boundaries.

Useful endpoints:

- `GET /api/auth/me` requires any valid user token.
- `GET /api/auth/staff-check` requires an `admin` or `librarian` token.
- `GET /api/catalog` lets authenticated users search and paginate active books.
- `POST /api/catalog`, `PATCH /api/catalog/:id`, and `DELETE /api/catalog/:id` are staff-only. Delete performs a soft archive.
- `GET /api/catalog/:bookId/copies` returns physical inventory for authenticated users.
- `POST /api/catalog/:bookId/copies`, `PATCH /api/copies/:id`, and `DELETE /api/copies/:id` are staff-only.
- `GET /api/loans/me` returns only the signed-in student's loan history through RLS.
- `GET /api/loans`, `POST /api/loans`, and `POST /api/loans/:id/return` are staff-only.
- `GET /api/circulation/members` and `GET /api/circulation/available-copies` support staff checkout selection.
- `GET /api/reservations/me`, `POST /api/reservations`, and `DELETE /api/reservations/:id` support student waitlists and cancellation.
- `GET /api/reservations` and `POST /api/reservations/expire` are staff-only reservation operations.
- `GET /api/fines/me` returns the signed-in student's fine and transaction history.
- `GET /api/fines`, `POST /api/fines/:id/payments`, and `POST /api/fines/:id/adjustments` are staff-only.
- `GET /api/dsa/overview` rebuilds the staff-only read-only DSA snapshot.
- `POST /api/dsa/validate-identifiers` demonstrates custom HashSet import validation without database writes.
- `POST /api/dsa/tree-search` demonstrates normalized-title BST lookup.
- `POST /api/dsa/graph-traverse` runs recommendation-graph BFS or DFS.
- `POST /api/dsa/catalog-algorithms` runs manual filtering, stable merge sort, and ranking.

The backend creates a Supabase client per request with the user's access token. This means database RLS remains active behind Express. No secret/service-role key is used by the catalog repository.

## Database authorization

- Students can read active catalog records, see their own loans/reservations, create their own reservations, and maintain their own profile display data.
- Librarians and admins can manage catalog records and physical copies, manage loans, view profiles, and manage reservations.
- Roles come from server-controlled `app_metadata.role`. RLS does not use editable `user_metadata`.
- Books are archived rather than deleted so future loan history can retain valid references.
- Physical copies with loan history, an active loan, or a reservation cannot be deleted. Staff should mark retained records as `lost` or `maintenance` instead.

## Physical copy inventory

Each bibliographic book can have multiple physical copies. Every copy has a unique barcode, shelf location, acquisition date, and one of five statuses: `available`, `on_loan`, `reserved`, `lost`, or `maintenance`. Catalog availability is calculated from these records rather than stored as a duplicated counter.

The book details page is available at `/catalog/:bookId`. Students can view availability and locations; librarians and admins can add, edit, search, and conditionally remove copy records. Copy management remains separate from the circulation service.

## Circulation workflow

The Borrowing page adapts to the signed-in role. Students see only their own active and returned loans. Staff can search members, select an available barcode, issue a 14-day loan through the existing `StudentBorrowingPolicy`, view all loans, identify overdue items, and process returns.

Checkout and return use PostgreSQL functions introduced by `202611080003_atomic_circulation.sql` and extended by the reservation migrations. Each function locks the relevant member, copy, loan, and reservation rows within one transaction. Checkout repeats availability, suspension, and five-active-loan checks after the TypeScript OOP policy runs. Return atomically closes the loan and either restores the copy to `available` or assigns it to the oldest pending reservation.

The migration also adds `profiles.email` and `profiles.status`. Users may update only their display name; they cannot grant themselves an active status. Students retain RLS access to book details referenced by their own history even if the title is later archived.

## Reservation workflow

Students can search unavailable catalog titles, join one waitlist per book, view their FIFO position, and cancel pending or ready reservations. Direct insert, update, and delete grants on reservation rows are revoked; all state changes pass through authenticated PostgreSQL functions that repeat role and ownership checks.

When staff return a copy, the same transaction locks the copy and selects the oldest pending reservation by `created_at` and ID. That reservation becomes `ready`, the copy becomes `reserved`, and a three-day pickup deadline is recorded. Staff can issue the assigned barcode only to that reservation's member. Cancellation or expiry releases the copy and immediately offers it to the next eligible student. The staff Reservations page provides ready-copy checkout and explicit expiry processing.

## Fine and payment workflow

`StandardOverdueFinePolicy` calculates each started overdue day using the active values in `fine_policy_config`. The initial policy charges PHP 10.00 per day, caps a loan's assessment at PHP 500.00, and blocks new borrowing at PHP 500.00 outstanding. These amounts are stored as integer centavos to avoid floating-point currency errors.

On return, the service calculates the assessment through the OOP policy and passes the result and return timestamp to one atomic PostgreSQL operation. The database independently recalculates the expected amount, closes the loan, creates at most one fine, and preserves reservation copy assignment. Payments and signed adjustments lock the fine, append an audit transaction, and update its balance in the same transaction. Students have read-only RLS access to their own ledger; only staff functions can mutate financial records.

## OOP evidence

- **Encapsulation:** private copy counts, member state, and loan state change only through validated methods.
- **Abstraction:** `LibraryItem` defines item behavior and `BorrowingPolicy` defines borrowing rules.
- **Inheritance:** `Book` and `ReferenceBook` specialize `LibraryItem` based on genuine item relationships.
- **Polymorphism:** `BorrowingService` operates through the policy contract, producing different student and staff loan periods without role conditionals.
- **Fine policy abstraction:** `FinePolicy` separates assessment rules from return orchestration, while `StandardOverdueFinePolicy` encapsulates daily rates and maximum charges.

The tests demonstrate these behaviors through public APIs rather than inspecting internal fields.

## DSA evidence

Milestone 8A implements a custom generic singly linked list for borrowing-history traversal, FIFO queues for per-title reservation ordering, a LIFO stack for newest-first catalog review, and a separate-chaining string HashSet for ISBN and barcode validation. Milestone 8B adds a title-indexing binary search tree, an adjacency-list recommendation graph with BFS and DFS, and explicit array filtering, stable merge sort, and ranking algorithms. The staff-only `/dsa-lab` page visualizes live read-only snapshots and displays complexity and performance measurements.

PostgreSQL remains authoritative; the structures are rebuilt in memory and do not pretend to replace durable storage or production catalog queries. Full design rationale, complexity tables, safety boundaries, and test evidence are documented in [`docs/dsa-milestone-8a.md`](docs/dsa-milestone-8a.md) and [`docs/dsa-milestone-8b.md`](docs/dsa-milestone-8b.md).
