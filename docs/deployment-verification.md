# Deployment verification

## Before deployment

1. Run `npm run check`; do not deploy if lint, either build, or any test fails.
2. Apply migrations in filename order with `supabase db push`. Confirm `audit_logs` exists and RLS is enabled.
3. Keep `supabase/seed.sql` for a local or designated demo project only. It contains no users or transactions and is repeatable.
4. Confirm no `.env` file or service-role key is tracked with `git status` and `git ls-files "*.env*"`.

## Render API

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CLIENT_ORIGIN`, `NODE_ENV=production`, `RATE_LIMIT_WINDOW_MS=60000`, and `RATE_LIMIT_MAX=120`. Build with `npm install && npm run build` in `server`; start with `npm start`.

Verify:

```bash
curl -i https://YOUR-RENDER-SERVICE.onrender.com/api/health
curl -i https://YOUR-RENDER-SERVICE.onrender.com/api/catalog
```

The health request must return 200 and an `x-request-id`. The unauthenticated catalog request must return 401 with `error.code` equal to `AUTH_REQUIRED`. Render logs should contain one-line JSON records with `event: "http.request"` and must not contain access tokens.

## Vercel client

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` to the public Render origin, then redeploy. Public Vite-prefixed values are browser configuration, never secrets.

Verify at 320 px and desktop width:

- Directly refresh `/login`, `/catalog`, and `/analytics`; none should produce a Vercel 404.
- Sign in as a student: protected pages work and Admin Analytics / DSA navigation is absent.
- Sign in as a librarian: circulation and DSA lab work; Admin Analytics remains forbidden.
- Sign in as an admin: `/analytics` shows live totals and an empty or populated audit activity list.
- Navigate using only Tab, Shift+Tab, Enter, Escape, and arrow keys where applicable. Focus must remain visible.
- Enable reduced motion at OS/browser level and confirm no essential information depends on animation.

## Non-destructive production smoke test

1. Load the catalog and one book-details page.
2. Load the role-appropriate borrowing, reservation, and fine history pages without creating records.
3. As admin, open analytics and refresh it. Compare title/copy totals with Supabase Table Editor counts.
4. In browser developer tools, confirm API responses have CSP, `x-content-type-options: nosniff`, `x-frame-options: DENY`, and rate-limit headers.
5. Perform one approved demo-only catalog edit, then verify a matching row appears in `audit_logs` and Admin Analytics. Restore the field through the application; that restoration should produce another audit record.

Record the deployed client URL, API URL, commit SHA, migration list, tester, and verification time in the project submission notes.
