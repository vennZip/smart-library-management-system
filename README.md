# Smart Library Borrowing and Management System

A university final project combining an accessible library operations interface with deliberate OOP and DSA implementations. Milestone 2 adds Supabase authentication, role authorization, and an initial OOP borrowing domain; it does **not** define the production database schema or DSA features.

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
server/src/
  auth/             verified Supabase identity and shared role types
  domain/           encapsulated library entities and policy abstractions
  middleware/       authentication and role authorization
  routes/           HTTP paths, status codes, and responses
  services/         business logic and domain orchestration
  app.ts            middleware and route composition
  server.ts         process startup only
```

The server follows a route-to-service boundary. Borrowing rules belong in services/domain classes, not React components or Express route handlers. No service-role key is needed for this milestone and one must never be exposed to the client.

## Setup and test

1. Run `npm install` inside both `client` and `server`.
2. Copy `client/.env.example` to `client/.env.local` and add Supabase browser credentials.
3. Copy `server/.env.example` to `server/.env`. Use the same Supabase URL and publishable key.
4. In separate terminals run `npm run dev:server` and `npm run dev:client` from the repository root.
5. Open `http://localhost:5173`. Check `http://localhost:3000/api/health` for JSON status.
6. Run `npm run check` for lint, builds, type checking, API authorization tests, and OOP tests.

Vite proxies `/api` requests to port 3000 during development. Express permits the configured `CLIENT_ORIGIN` (default `http://localhost:5173`) through CORS.

## Authentication and roles

The browser uses Supabase email/password Auth and listens for session changes. Protected API requests must send `Authorization: Bearer <access-token>`. Express validates that token with Supabase before reading `app_metadata.role`; it never accepts a role from the request body. Supported roles are `admin`, `librarian`, and `student`. A missing or invalid role becomes the least-privileged `student` role.

For this schema-free milestone, create test users through Supabase Authentication and assign server-controlled app metadata such as `{ "role": "librarian" }` using the Supabase dashboard or Admin API. Members and Reports are staff-only. Frontend guards improve navigation, while Express authorization is the security boundary. Row Level Security policies are still required after the database schema is designed.

Useful endpoints:

- `GET /api/auth/me` requires any valid user token.
- `GET /api/auth/staff-check` requires an `admin` or `librarian` token.

## OOP evidence

- **Encapsulation:** private copy counts, member state, and loan state change only through validated methods.
- **Abstraction:** `LibraryItem` defines item behavior and `BorrowingPolicy` defines borrowing rules.
- **Inheritance:** `Book` and `ReferenceBook` specialize `LibraryItem` based on genuine item relationships.
- **Polymorphism:** `BorrowingService` operates through the policy contract, producing different student and staff loan periods without role conditionals.

The tests demonstrate these behaviors through public APIs rather than inspecting internal fields.

## Academic implementation roadmap

The OOP foundation is implemented. DSA requirements will each support a named feature and receive algorithm-focused tests: arrays for result sets, linked lists for borrowing history, HashSets for unique reservations/tags, stacks for undo, queues for waitlists, trees for catalog indexing, and graphs for recommendations or location navigation.

These structures must be implemented and justified rather than merely relying on database tables or JavaScript built-ins. Complexity notes and unit tests will accompany each later feature. They remain intentionally unimplemented.
