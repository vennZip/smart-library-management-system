# CSCMINHS Library System

A full-stack web application for managing the Cristobal S. Conducto Memorial Integrated National High School library catalog, physical inventory, circulation, reservations, and account balances.

## Features

- Secure email and password authentication
- Student, librarian, and administrator access levels
- Searchable book catalog and physical-copy inventory
- Borrowing, returns, overdue tracking, and loan history
- One seven-day renewal for eligible loans
- FIFO reservations with pickup deadlines
- Private in-app due-date and waitlist notifications
- Staff handling of lost/damaged books with recorded reasons and charges
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

Run `npm run check` for lint, builds, frontend/backend tests, and isolated PostgreSQL regression tests. See [circulation enhancements](docs/circulation-enhancements.md) for notification schedules, renewal rules, incident handling, and migration/deployment steps.
