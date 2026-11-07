# Smart Library Borrowing and Management System

A university final project combining an accessible library operations interface with deliberate OOP and DSA implementations. This first milestone provides the application shell, a placeholder dashboard, and an API health endpoint; it does **not** define the production database schema or full business workflows.

## Stack

- Client: React, Vite, TypeScript, React Router, Tailwind CSS
- Server: Node.js, Express, TypeScript
- Platform: Supabase PostgreSQL and Auth (connection helper only in this milestone)

## Architecture

```text
client/src/
  components/       reusable presentation and layout components
  data/             temporary UI-only placeholder data
  lib/              external clients such as Supabase
  pages/            route-level screens
server/src/
  routes/           HTTP concerns: paths, status codes, request/response
  services/         business logic and domain orchestration
  app.ts            middleware and route composition
  server.ts         process startup only
```

The server follows a route → service boundary. Future borrowing rules belong in services/domain classes, not React components or Express route handlers. Supabase's service-role key must never be exposed to the client.

## Setup and test

1. Run `npm install` inside both `client` and `server`.
2. Copy `client/.env.example` to `client/.env.local` and add Supabase browser credentials.
3. Copy `server/.env.example` to `server/.env` and keep server secrets private.
4. In separate terminals run `npm run dev:server` and `npm run dev:client` from the repository root.
5. Open `http://localhost:5173`. Check `http://localhost:3000/api/health` for JSON status.
6. Run `npm run check` for lint, builds, type checking, and the API test.

Vite proxies `/api` requests to port 3000 during development. Express also permits the configured `CLIENT_ORIGIN` (default `http://localhost:5173`) through CORS.

## Academic implementation roadmap

OOP requirements will be visible in backend domain code: encapsulated private state, abstract base entities/services, inheritance for library item types, and polymorphic borrowing behavior. DSA requirements will each support a named feature and receive algorithm-focused tests: arrays for result sets, linked lists for borrowing history, HashSets for unique reservations/tags, stacks for undo, queues for waitlists, trees for catalog indexing, and graphs for recommendations or location navigation.

These structures must be implemented and justified rather than merely relying on database tables or JavaScript built-ins. Complexity notes and unit tests will accompany each later feature. They are intentionally not implemented in this initial scaffold.
