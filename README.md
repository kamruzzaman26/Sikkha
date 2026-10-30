# Sikkha Nogori

The Next.js application is in [`sikkha-nogori/`](./sikkha-nogori/). Supabase
migration notes and the known live/local schema mismatch are in
[`supabase/README.md`](./supabase/README.md).

## Clone and run locally

```bash
git clone https://github.com/kamruzzaman26/Sikkha.git
cd Sikkha/sikkha-nogori
npm ci
cp .env.example .env.local
```

Alternatively, choose **Code → Download ZIP** on GitHub, extract the archive,
then open its `sikkha-nogori/` directory and continue with `npm ci`.

Edit `.env.local` and replace the example values:

- `NEXT_PUBLIC_SUPABASE_URL`: your Supabase project's HTTPS URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: its publishable key (not a
  service-role key).
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` for local work; use the
  canonical HTTPS origin for production.
- `CONTACT_EMAIL`: optional public contact address.

Keep `.env.local` private. It is ignored by Git. Never commit API secrets,
passwords, access tokens, or service-role credentials.

Run the app and checks from `sikkha-nogori/`:

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Open [http://localhost:3000](http://localhost:3000) during development.
GitHub Actions runs lint, type-checking, tests, and a production build on pushes
and pull requests. CI uses placeholder environment values and does not access
the Supabase project or deploy.

## Supabase

Create or select a Supabase project and configure the two public values above.
Configure the site's canonical URL and `/auth/confirm` redirect in Supabase
Auth settings. The application uses session cookies and a server-side
`public.is_admin()` RPC for admin access. The current live schema and local
migrations do not agree; read [`supabase/README.md`](./supabase/README.md)
before considering any SQL. Migrations are not run automatically, and the
repository workflow does not modify a database.

For the full feature and operational notes, see
[`sikkha-nogori/README.md`](./sikkha-nogori/README.md).
