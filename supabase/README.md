# Supabase setup and migration status

## Current application authorization contract

Admin requests are checked on the server in
`sikkha-nogori/src/lib/supabase/admin.ts`. The app asks Supabase to execute
`public.is_admin()` using the signed-in user's session and grants access only
when the RPC returns boolean `true`. RPC errors fail closed. The project
documentation describes the live project's role source as `public.user_roles`.

The function definition is not present in the repository's migrations, so its
SQL body, grants, and exact `user_roles` policy cannot be independently
verified from this workspace. The migrations below instead create or use
`public.admin_users` and several RPCs authorize against that table. This is a
known discrepancy; do not assume the local migrations reproduce the live
authorization implementation.

## Local migration inventory

Apply order by filename, **not an approval to apply**:

1. `migrations/202610230001_initial_schema.sql` — currently a one-byte empty
   file; it does not bootstrap the schema.
2. `migrations/202610250001_admin_affiliate_links.sql` — products, affiliate
   links/domains, and `admin_users` schema and policies.
3. `migrations/202610250002_payment_methods.sql` — payment methods and
   associated policies.
4. `migrations/202610250003_orders_checkout.sql` — checkout, orders, payment
   submissions, and order RPCs.
5. `migrations/202610290001_customer_affiliate_entitlements.sql` — customer
   profiles, affiliate/referral records, entitlements, and private storage
   setup.
6. `migrations/202610290002_product_management.sql` — product catalog changes
   and admin import RPC; its comments and the application README treat this as
   a review draft.

These are local files only. No live database was inspected or modified during
this workspace audit, and no migration was run. The project README reports
that the live database uses `public.user_roles`, while local migrations use
`public.admin_users`; the initial migration is also empty. Consequently the
local migration set is not a verified, complete bootstrap for the live schema.
Reconcile the schemas and review/back up the target database before any
separately approved migration plan.

## Connecting a local application

In `sikkha-nogori/`, copy `.env.example` to `.env.local` and supply the
Supabase HTTPS project URL, its publishable key, and the canonical site URL.
Set the Supabase Auth site URL and allowed redirect URLs for the local or
deployed app, including the `/auth/confirm` callback. `.env.local` is ignored
by Git. The app does not require a service-role key and must not expose one.

The app does not run SQL, migrations, data exports, or deployments on startup.
Use a reviewed migration process only after resolving the schema mismatch and
obtaining explicit approval for the target database.
