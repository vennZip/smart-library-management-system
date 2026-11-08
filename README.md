# Smart Library Borrowing and Management System

A university final project combining an accessible library operations interface with deliberate OOP and DSA implementations. Milestone 4 adds staff-managed physical copy inventory and accurate availability counts. DSA features and complete circulation workflows remain intentionally out of scope.

## Stack

- Client: React, Vite, TypeScript, React Router, Tailwind CSS
- Server: Node.js, Express, TypeScript
- Platform: Supabase Auth now; PostgreSQL schema in a later milestone

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

The first migration creates profiles, books, physical copies, loans, and reservations with constraints, indexes, triggers, grants, and RLS. The second grants staff-controlled deletion for unreferenced copies while the loan foreign key continues to prevent historical data loss. Apply all pending migrations in timestamp order:

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

For this schema-free milestone, create test users through Supabase Authentication and assign server-controlled app metadata such as `{ "role": "librarian" }` using the Supabase dashboard or Admin API. Members and Reports are staff-only. Frontend guards improve navigation, while Express authorization is the security boundary. Row Level Security policies are still required after the database schema is designed.

Useful endpoints:

- `GET /api/auth/me` requires any valid user token.
- `GET /api/auth/staff-check` requires an `admin` or `librarian` token.
- `GET /api/catalog` lets authenticated users search and paginate active books.
- `POST /api/catalog`, `PATCH /api/catalog/:id`, and `DELETE /api/catalog/:id` are staff-only. Delete performs a soft archive.
- `GET /api/catalog/:bookId/copies` returns physical inventory for authenticated users.
- `POST /api/catalog/:bookId/copies`, `PATCH /api/copies/:id`, and `DELETE /api/copies/:id` are staff-only.

The backend creates a Supabase client per request with the user's access token. This means database RLS remains active behind Express. No secret/service-role key is used by the catalog repository.

## Database authorization

- Students can read active catalog records, see their own loans/reservations, create their own reservations, and maintain their own profile display data.
- Librarians and admins can manage catalog records and physical copies, manage loans, view profiles, and manage reservations.
- Roles come from server-controlled `app_metadata.role`. RLS does not use editable `user_metadata`.
- Books are archived rather than deleted so future loan history can retain valid references.
- Physical copies with loan history, an active loan, or a reservation cannot be deleted. Staff should mark retained records as `lost` or `maintenance` instead.

## Physical copy inventory

Each bibliographic book can have multiple physical copies. Every copy has a unique barcode, shelf location, acquisition date, and one of five statuses: `available`, `on_loan`, `reserved`, `lost`, or `maintenance`. Catalog availability is calculated from these records rather than stored as a duplicated counter.

The book details page is available at `/catalog/:bookId`. Students can view availability and locations; librarians and admins can add, edit, search, and conditionally remove copy records. This milestone does not issue loans, place reservations, calculate fines, or implement an assessed DSA structure.

## OOP evidence

- **Encapsulation:** private copy counts, member state, and loan state change only through validated methods.
- **Abstraction:** `LibraryItem` defines item behavior and `BorrowingPolicy` defines borrowing rules.
- **Inheritance:** `Book` and `ReferenceBook` specialize `LibraryItem` based on genuine item relationships.
- **Polymorphism:** `BorrowingService` operates through the policy contract, producing different student and staff loan periods without role conditionals.

The tests demonstrate these behaviors through public APIs rather than inspecting internal fields.

## Academic implementation roadmap

The OOP foundation is implemented. DSA requirements will each support a named feature and receive algorithm-focused tests: arrays for result sets, linked lists for borrowing history, HashSets for unique reservations/tags, stacks for undo, queues for waitlists, trees for catalog indexing, and graphs for recommendations or location navigation.

These structures must be implemented and justified rather than merely relying on database tables or JavaScript built-ins. Complexity notes and unit tests will accompany each later feature. They remain intentionally unimplemented.
