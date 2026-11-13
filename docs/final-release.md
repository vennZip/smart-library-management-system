# Final deployment and release process

## Release gate

From the repository root:

```powershell
npm run check
git diff --check
git status --short
```

The gate must show passing lint, client/server builds, all tests, smoke-script syntax, and no unexpected files. Do not commit `.env`, access tokens, database passwords, or service-role credentials.

## Database

Link the intended Supabase project, review pending migrations, then apply them:

```powershell
npx supabase migration list --linked
npx supabase db push --remote
```

Confirm RLS is enabled and `audit_logs` exists. `supabase/seed.sql` is optional demo data and must not be run in an unapproved production project.

## Application deployment

1. Push the release commit to `main`.
2. Confirm Render builds `server`, starts `node dist/server.js`, and reports a healthy `/api/health`.
3. Confirm Vercel builds `client` and the SPA rewrite serves direct route refreshes.
4. Verify Vercel has `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL`.
5. Verify Render has `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CLIENT_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, and `RATE_LIMIT_MAX`.

## Automated deployed smoke test

PowerShell:

```powershell
$env:CLIENT_URL='https://YOUR-VERCEL-DOMAIN.vercel.app'
$env:API_URL='https://YOUR-RENDER-SERVICE.onrender.com'
npm run smoke:production
```

The smoke runner is read-only. It validates health, security headers, anonymous authorization, CORS, and SPA fallbacks for `/login`, `/catalog`, and `/analytics`.

## Manual role verification

Run the three flows in `demo-scenarios.md`. Test keyboard navigation at 320, 768, 1024, and 1440 px. Check visible focus, Escape-to-close mobile navigation, headings, labels, loading/error/empty states, and reduced-motion behavior.

## Tag the submission

After production verification:

```powershell
git tag -a v1.0.0 -m "Smart Library final university submission"
git push origin v1.0.0
```

Create the GitHub release from `v1.0.0` with links to the deployed client, API health endpoint, academic evidence, and the passing test count. Attach no secrets or database exports containing personal data.

## Rollback

Application rollback uses the previous verified Vercel/Render commit. Do not reverse a database migration by deleting tables in production. Create and test a forward corrective migration instead. Preserve loans, fines, payments, reservations, and audit evidence.
