This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Catalog and affiliate link administration

Runtime admin access is checked server-side through `public.is_admin()` using
the signed-in Supabase session. The live project's `public.user_roles` table is
the role source; only a true result from `is_admin()` grants access. Do not use
client metadata or client-side role state for authorization.

The local SQL migrations still target the legacy `public.admin_users` schema
and its policies/functions. They do not match the live project's
`public.user_roles` schema. Do not apply those migrations to that project until
all dependent policies and database functions have been reviewed and adapted.

The admin page can add and edit products in `public.products`. For an existing
sample book page, use the exact same slug as that book's detail URL; course
pages are listed from published `course` products. Publish a product to make
it visible publicly. Product records are never deleted by the admin UI, so
associated affiliate links remain intact.

### Product-management migration proposal

`../supabase/migrations/202610290002_product_management.sql` is a review-only
migration draft. It has **not** been applied to any database. It adds
extensible product types, image URLs, affiliate/direct-sale classification,
archival, and public-catalog/order safeguards using the existing product
tables. Before applying it, review the SQL and back up the target database.

The draft intentionally does not guess whether existing products are direct
sales or affiliate referrals. Their `commerce_mode` remains `NULL`, so those
rows are hidden from public catalogs and checkout until an administrator
classifies them. Direct-sale products require a non-negative price; affiliate
products must use their exact validated partner URL and are excluded from
internal checkout. Archive operations preserve product and order history.
Apply only after explicit approval and classification planning; the app never
runs migrations automatically.

### Admin CSV book import

The admin CSV import accepts exactly these three headers:
`book_name,affiliate_url,image_url`. Files are limited to 500 data rows and
512 KiB. Preview parses and validates rows without writing products; it checks
approved HTTPS affiliate hostnames, safe HTTPS image URLs, malformed CSV,
in-file duplicates, and existing product titles/affiliate URLs. Confirm
revalidates on the server and calls the Admin-only
`admin_import_affiliate_books` database function. Each product and affiliate
link are inserted atomically; a failed row does not leave a partial product.
Concurrent imports are serialized and duplicate checks run again in the
database, so repeating the same file will not create the same products again.

Imported rows retain the CSV's exact title and URLs and start as unpublished
book drafts with no guessed description or price. An admin can review and
publish them from the product catalog. The function checks the authenticated
user's `public.admin_users` membership with role `admin`; editors and public
users cannot call it. The import needs the product-management migration above,
including its new `image_url` and `commerce_mode` columns and RPC. That
migration remains a local review draft and has not been applied to any
database.

Authorized admins can associate HTTPS affiliate URLs issued by Rokomari or
10 Minute School with a product. Only active links on published products
appear publicly. The application does not invent or prefill partner URLs. The
`public.affiliate_partner_domains` table allowlists `rkmri.co` and `10ms.io`
as affiliate redirect-entry hosts. Separately, the migration records
`www.rokomari.com` and `10minuteschool.com` in
`public.affiliate_partner_destinations` as final-destination hosts. Entry-host
approval does not verify where a short link redirects or guarantee that
affiliate commission tracking is retained. Confirm a link's destination and
tracking with the partner before treating it as commission-eligible.

```sql
insert into public.affiliate_partner_domains (partner, hostname)
values
  ('rokomari', '<additional-rokomari-entry-hostname>'),
  ('10_minute_school', '<additional-10-minute-school-entry-hostname>');
```

### Safe short-link and destination validation

The current application validates the submitted URL's scheme and exact
allowlisted entry hostname; it does not fetch URLs or follow redirects. If
server-side redirect validation is added, it must run in a controlled
validator and follow each redirect manually (never automatic HTTP-client
redirect handling):

1. Require HTTPS on the submitted URL and every `Location` target. Reject
   credentials, unexpected ports, malformed URLs, and hostnames not explicitly
   allowed for that partner and redirect role. Check each redirect-entry hop
   against `public.affiliate_partner_domains` and the final host against
   `public.affiliate_partner_destinations`.
2. Keep the entry-host and final-destination allowlists separate; the
   short-link entry hosts are not final destinations.
3. Cap redirects (for example, five); fail closed on missing/invalid `Location`,
   loops, HTTPS downgrade, or an unapproved host at any hop. Re-check HTTPS and
   hostname at every hop instead of validating only the first and last URLs.
4. Resolve DNS for every hop and reject all private, loopback, link-local,
   multicast, reserved, and otherwise non-public IPv4/IPv6 addresses. Pin the
   validated address for the connection to prevent DNS-rebinding between
   validation and fetch.
5. Do not forward cookies, authorization headers, or other user credentials.
   Apply short connection/read timeouts and response-size limits; do not treat
   a successful HTTP response as proof that affiliate attribution is retained.

The app does not currently follow redirects, and an allowlisted short-link
host or a redirect-checker result does not certify the final destination or
commission attribution.

Set `CONTACT_EMAIL` in the deployment environment to a verified public contact
address. Without it, the contact page deliberately explains that no contact
address has been configured.

Database migrations are not run automatically by the application. Back up the
Supabase project and apply reviewed migrations through the deployment process;
never point a fresh deployment at an empty database without first applying the
migrations and configuring an administrator.

## About page and payment methods

The public `/about` page describes the platform, its purpose, focus areas, and
goal. It makes no claims about unverified achievements or affiliate programs.

Payment methods are managed at `/admin/payments` by users with the `admin` role
in `public.admin_users`; editors and customers cannot manage them. Apply
`../supabase/migrations/202610250002_payment_methods.sql` through the reviewed
database migration process before using the page. The migration creates one
`public.payment_methods` table with row-level security, public reads restricted
to enabled non-gateway methods, and write policies limited to admins. Public
queries return only the fields needed to display a method, not its reserved
configuration column.

The `configuration` JSON object is reserved for future non-secret adapter
settings and is not editable from this admin page. Never store API keys,
gateway secrets, credentials, or private payment details in this table or any
public environment variable. Keep future credentials in server-side secret
storage. Gateway methods cannot be enabled or shown to customers until a
gateway adapter and verified callback/webhook processing exist. No gateway is
connected.

Manual instructions are informational only. Entering a transaction reference
does not mark an order as paid. Admin verification is required before a
manual-payment order can proceed. COD payment is marked verified only after an
admin records delivery and confirms cash collection. Paid orders cannot be
cancelled in this flow because refunds are not implemented.

## Checkout and order management

Apply `../supabase/migrations/202610250003_orders_checkout.sql` through the
reviewed database migration process before enabling checkout. Customers must
sign in or create an account; email-confirmation behavior follows the
configured Supabase Auth project. Set `NEXT_PUBLIC_SITE_URL` to the canonical
public origin and add it to Supabase Auth's allowed redirect URLs. If email
confirmation is enabled, use `{{ .ConfirmationURL }}` in the Supabase
confirmation email template; the app sends users back to `/auth/confirm` and
completes the confirmation before opening their dashboard. The callback also
supports token-hash confirmation links. The checkout accepts only published
`public.products`, active manual/COD payment methods, quantities, and delivery
details. A database RPC locks the selected rows, rechecks availability and
current database prices, computes the total in BDT, snapshots product and
payment details, and uses a per-user idempotency key. Client-supplied totals
and payment states are not accepted.

Customers can see only their own orders and submit a manual transaction
reference. References are kept in an append-only review history and are unique
per payment method; submitting one leaves the payment unverified until an
admin reviews it. Admin-only RPCs enforce payment review and order-state
transitions. COD can be marked paid only after the order is delivered and an
admin confirms cash collection. Gateway methods are excluded from checkout;
there is no gateway initiation, callback, webhook, or refund integration.
Customer/order data is private under RLS, and the authenticated client has no
direct order or payment-submission write privileges.

The homepage book cards remain labeled sample content and are not the checkout
catalog. Only published database products are orderable. The order workflow
does not implement inventory reservation, shipping fees, tax calculation, or
customer cancellation. It does not provide payment gateway integration. Refund
records are administrative only; actual refunds are processed outside the
application. Review the migration and configure real products, enabled payment
methods, Supabase email/auth settings, delivery operations, and privacy/
retention requirements before accepting real orders.

## Customer, affiliate, and protected product access

Apply `../supabase/migrations/202610290001_customer_affiliate_entitlements.sql`
after `202610250001_admin_affiliate_links.sql`,
`202610250002_payment_methods.sql`, and
`202610250003_orders_checkout.sql`. The earlier
`202610230001_initial_schema.sql` is empty and does not bootstrap the schema.
This migration is additive: it creates
customer profiles and affiliate/referral records, backfills profiles for
existing Auth users and entitlements for existing verified orders, adds
account suspension and refund state, and installs authorization policies and
order triggers. It does not delete existing records or assign affiliate/admin
roles to customers. The migration creates the private
`sikkha-protected-products` Storage bucket. It stops with an error if that
dedicated bucket already exists as public; inspect and resolve that state
before applying the migration. Review and back up the Supabase project first.
The migration has not been applied by the application.

Registration and login continue to use Supabase Auth and its server-managed
session cookies. New accounts start as customers. User-supplied Auth metadata
is used only for the display name; roles are never read from it. Profiles,
orders, referral statistics, and entitlements are protected by RLS. Admin
membership remains the separate `public.admin_users` table. Admins can suspend
or reactivate customer accounts and review affiliate applications; suspension
blocks customer routes, order operations, and private product access. Affiliate
approval creates a distinct affiliate account and referral code, never an
admin membership.

`/r/<code>` records a referral code in an HttpOnly, SameSite=Lax cookie. The
order RPC validates the code against an active affiliate, rejects self-referral,
and records attribution without granting access or exposing customer details.
Referral orders count as converted only after payment verification. Statistics
are order totals, not a commission or payout calculation; rates, settlement,
and affiliate payouts are not configured.

Entitlements are created for order items only when the database verifies
payment, and are revoked when payment is rejected, failed, cancelled, refunded,
or the order is cancelled. `/dashboard/purchases` shows the customer's own
purchase history; private resource requests re-check the signed-in user and
active entitlement before returning a 60-second signed Storage URL. Public
object URLs are not used. To deliver a protected resource, an admin must upload
it to the private bucket and register its bucket-relative object path in
`public.product_resources`, for example:

```sql
insert into public.product_resources (product_id, storage_path)
values ('<product-uuid>', 'courses/example/lesson.pdf')
on conflict (product_id) do update
set storage_path = excluded.storage_path, updated_at = now();
```

The admin refund action only records a refund after an administrator confirms
the external refund has already been processed; the application does not send
money. No payment gateway, verified webhook, or automated refund integration
is configured. Keep `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the application environment, and set
`NEXT_PUBLIC_SITE_URL` to the canonical public origin (HTTPS in production) so
affiliate links can be shared as absolute URLs. No service-role key or new
secret is required.

## Storefront navigation and wishlist

The shared storefront shell in `src/components/site-shell.tsx` provides the
public header, keyboard-accessible navigation drawer, account menu, and footer
across routes. Account details and the admin link are populated server-side
from Supabase; the public catalog does not require login. Category navigation
uses the existing `bookCategories` configuration in `src/lib/books.ts`.

When the product-management migration is available, `/books` reads published,
unarchived, classified database books with search, category filtering, sorting,
and pagination. If the required catalog schema is unavailable, the page falls
back to visibly labeled sample books; fixture prices and collection labels are
not shown as current prices, discounts, bestseller ranks, or sales data. A
book's outbound affiliate button is shown only when an active database link
exists; otherwise its detail page states that no verified purchase link is
available. The secure `/checkout` flow is limited to published, unarchived
first-party products and is not a cart for affiliate items.

Guest wishlist entries are stored in that browser's local storage and are not
synced to a customer account. The storefront includes an affiliate disclosure
at `/affiliate-disclosure`. Terms, privacy, FAQ, reviews, ebook/audio-book
catalogs, verified promotions, and database-managed category administration
are not currently implemented and are intentionally not advertised in the
navigation. After the proposal is reviewed and applied, `/products` and
`/products/[slug]` expose published non-book, non-course products with
type/category filtering, search, alphabetical sorting, and pagination.
`/courses` remains the course catalog. The guest wishlist is browser-local and
resolves published products across the catalog; account synchronization and
internal cart behavior are not implemented. Categories remain a text field,
not a separate managed taxonomy. Migration
`202610290002_product_management.sql` is only a local review draft; no
production migration, data change, or deployment has been performed.

## Project setup and verification

From the repository root, enter `sikkha-nogori/`, install the locked
dependencies, and configure local environment values:

```bash
cd sikkha-nogori
npm ci
cp .env.example .env.local
```

Edit `.env.local` with the Supabase project URL and publishable key from the
project's API settings. Set `NEXT_PUBLIC_SITE_URL` to the canonical site
origin; `CONTACT_EMAIL` is optional. `.env.local` is ignored by Git. Never put
service-role keys, passwords, or other secrets in `NEXT_PUBLIC_*` variables or
commit them.

Start development with `npm run dev`, then open
[http://localhost:3000](http://localhost:3000). Before sharing changes, run:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

GitHub Actions runs lint, TypeScript, tests, and a production build on pushes
and pull requests. Its build uses non-secret placeholder environment values;
it does not connect to Supabase or deploy the application.

Tailwind CSS 4 is loaded through `src/app/globals.css` and the
`@tailwindcss/turbopack` loader in `next.config.ts`; this project does not use a
separate `postcss.config.*` or `tailwind.config.*` file.

For Supabase setup, auth redirect configuration, the known schema mismatch,
migration order, and the current `is_admin()` RPC contract, see
[`../supabase/README.md`](../supabase/README.md). Do not apply the local SQL
migrations to the live project until that mismatch is resolved and the target
schema has been reviewed and backed up. The app does not apply migrations.

## Next.js template reference

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Application routes live under `src/app/`; the page auto-updates while the
development server is running.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
