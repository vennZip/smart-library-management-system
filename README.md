# CSCMINHS Library System

A full-stack web application for managing the Cristobal S. Conducto Memorial Integrated National High School library catalog, physical inventory, circulation, reservations, and account balances.

## Features

- Secure email and password authentication
- Student, librarian, and administrator access levels
- Searchable book catalog and physical-copy inventory
- Borrowing, returns, overdue tracking, and loan history
- FIFO reservations with pickup deadlines
- Fine, payment, and adjustment records
- Administrative analytics and audit history
- Responsive interface for desktop and mobile devices

## Technology

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database and authentication:** Supabase PostgreSQL and Auth
- **Hosting:** Vercel and Render

## Project structure

```text
client/                React frontend
server/                Express API
supabase/migrations/   Database migrations and security policies
docs/                  Architecture and deployment documentation
```

## Local setup

Requirements: Node.js 20 or newer and a Supabase project.

1. Install dependencies in `client` and `server`:

   ```bash
   cd client
   npm install
   cd ../server
   npm install
   ```

2. Copy `client/.env.example` to `client/.env.local` and `server/.env.example` to `server/.env`.

3. Add your Supabase URL and publishable key to both files. Set `VITE_API_URL` to `http://localhost:3000` and `CLIENT_ORIGIN` to `http://localhost:5173`.

4. Apply the database migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push --remote
   ```

5. From the repository root, start the application in two terminals:

   ```bash
   npm run dev:server
   npm run dev:client
   ```

The application runs at `http://localhost:5173`. The API health endpoint is `http://localhost:3000/api/health`.

## Environment variables

Client:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_API_URL=http://localhost:3000
```

Server:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
CLIENT_ORIGIN=http://localhost:5173
PORT=3000
```

Never commit `.env` or `.env.local` files.

## Quality checks

Run the complete validation suite from the repository root:

```bash
npm run check
```

This checks the client, builds the frontend and backend, and runs the automated tests.

## Deployment

Deploy `client` to Vercel and `server` to Render. Configure the same Supabase project in both services, set `VITE_API_URL` to the Render API URL, and set `CLIENT_ORIGIN` to the Vercel application URL. Apply pending Supabase migrations before deploying application code that depends on them.

Detailed release and verification steps are available in [`docs/final-release.md`](docs/final-release.md) and [`docs/deployment-verification.md`](docs/deployment-verification.md).
