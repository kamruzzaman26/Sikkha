import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationUrl = new URL(
  "../../../supabase/migrations/202610290001_customer_affiliate_entitlements.sql",
  import.meta.url,
);

test("customer role and profile fields cannot be elevated by authenticated users", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /account_status text not null default 'active'/i);
  assert.match(migration, /grant update \(display_name, phone, updated_at\)/i);
  assert.match(migration, /grant insert \(user_id\) on public\.affiliate_applications/i);
  assert.match(migration, /revoke all on public\.affiliate_accounts from public, anon, authenticated/i);
  assert.match(migration, /where user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /admin_set_customer_status[\s\S]+role = 'admin'/i);
  assert.match(migration, /admin_review_affiliate[\s\S]+role = 'admin'/i);
  assert.doesNotMatch(
    migration,
    /grant\s+(?:insert|update|delete)\s+on public\.(?:customer_profiles|affiliate_accounts)/i,
  );
});

test("customer email signup returns through the configured confirmation callback", async () => {
  const actions = await readFile(
    new URL("../app/login/actions.ts", import.meta.url),
    "utf8",
  );
  const confirmation = await readFile(
    new URL("../app/auth/confirm/route.ts", import.meta.url),
    "utf8",
  );
  const supabaseEnv = await readFile(
    new URL("./supabase/env.ts", import.meta.url),
    "utf8",
  );

  assert.match(actions, /emailRedirectTo:\s*new URL\("\/auth\/confirm", getPublicSiteOrigin\(\)\)/);
  assert.match(confirmation, /exchangeCodeForSession\(code\)/);
  assert.match(confirmation, /verifyOtp\(\s*\{\s*token_hash:\s*tokenHash/s);
  assert.match(supabaseEnv, /NEXT_PUBLIC_SITE_URL/);
  assert.match(supabaseEnv, /parsedUrl\.protocol !== "https:"/);
});

test("forwarded local Server Action origins are allowed only during development", async () => {
  const nextConfig = await readFile(
    new URL("../../next.config.ts", import.meta.url),
    "utf8",
  );

  assert.match(nextConfig, /process\.env\.NODE_ENV === "development"/);
  assert.match(nextConfig, /allowedOrigins:\s*\["localhost:3000", "localhost:3101"\]/);
  assert.doesNotMatch(nextConfig, /allowedOrigins:\s*\[[^\]]*\*/);
});

test("entitlements are granted only on verified orders and revoked on invalidated payment", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(
    migration,
    /if new\.payment_status = 'verified' and new\.status <> 'cancelled' then/i,
  );
  assert.match(
    migration,
    /set status = 'revoked', revoked_at = coalesce\(revoked_at, now\(\)\)/i,
  );
  assert.match(
    migration,
    /where orders\.payment_status = 'verified'\s+and orders\.status <> 'cancelled'/i,
  );
  assert.match(migration, /payment_status in \([\s\S]*'refunded'/i);
  assert.match(migration, /set payment_status = 'refunded'/i);
});

test("protected content uses a private bucket and entitlement-checked storage policy", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const route = await readFile(
    new URL("../app/api/products/[productId]/access/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(migration, /values \('sikkha-protected-products'.*false\)/i);
  assert.match(migration, /bucket_id = 'sikkha-protected-products'/i);
  assert.match(migration, /entitlement\.status = 'active'/i);
  assert.match(route, /\.eq\("user_id", user\.id\)/);
  assert.match(route, /\.eq\("status", "active"\)/);
  assert.match(route, /createSignedUrl\(resource\.storage_path, 60\)/);
  assert.match(route, /Cache-Control", "private, no-store"/);
});

test("affiliate referrals cannot grant admin permissions and only verified orders convert", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /user_id <> requesting_user/i);
  assert.match(migration, /when new\.payment_status = 'verified' and new\.status <> 'cancelled'\s+then 'converted'/i);
  assert.match(migration, /on conflict \(order_id\) do nothing/i);
  assert.match(migration, /affiliate_user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /create or replace function public\.admin_review_affiliate/i);
  assert.match(migration, /create or replace function public\.get_my_affiliate_stats\(\)[\s\S]+status = 'active'/i);
  assert.match(migration, /grant execute on function public\.get_my_affiliate_stats\(\) to authenticated/i);
});
