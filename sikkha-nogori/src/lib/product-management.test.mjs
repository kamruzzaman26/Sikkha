import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationUrl = new URL(
  "../../../supabase/migrations/202610290002_product_management.sql",
  import.meta.url,
);

test("product types extend the existing product table without deleting rows", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /create table if not exists public\.product_types/i);
  assert.match(migration, /alter column price drop not null/i);
  assert.match(migration, /foreign key \(product_type\)[\s\S]+references public\.product_types/i);
  assert.match(migration, /add column if not exists archived_at timestamptz/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\s+public\.products\b/i);
});

test("public catalog visibility excludes drafts, archives, and unclassified products", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(
    migration,
    /is_published\s+and archived_at is null\s+and commerce_mode is not null/i,
  );
  assert.match(
    migration,
    /where is_published and archived_at is null and commerce_mode is not null/i,
  );
});

test("affiliate links cannot be checked out as direct-sale order items", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(
    migration,
    /commerce_mode is distinct from 'direct'\s+or \(price is not null and price >= 0\)/i,
  );
  assert.match(
    migration,
    /security definer\s+set search_path = ''[\s\S]+create trigger enforce_direct_product_order_items/i,
  );
  assert.match(migration, /commerce_mode = 'direct'/i);
  assert.match(
    migration,
    /revoke all on function public\.enforce_direct_product_order_items\(\)\s+from public, anon, authenticated/i,
  );
});

test("bulk import RPC independently authorizes Admins and exposes no public execute grant", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const action = await readFile(
    new URL("../app/admin/import-actions.ts", import.meta.url),
    "utf8",
  );
  const importFunction = migration.match(
    /create or replace function public\.admin_import_affiliate_books[\s\S]+?\n\$\$;/i,
  )?.[0];

  assert.ok(importFunction);
  assert.match(importFunction, /security definer/i);
  assert.match(importFunction, /role = 'admin'/i);
  assert.match(importFunction, /using errcode = '42501'/i);
  assert.match(
    migration,
    /revoke all on function public\.admin_import_affiliate_books\(jsonb, boolean\)\s+from public, anon, authenticated;\s+grant execute on function public\.admin_import_affiliate_books\(jsonb, boolean\)\s+to authenticated;/i,
  );
  assert.match(action, /requireAdmin\("admin"\)/);
  assert.match(action, /prepareBookImportCsv\(csvText, partnerByHostname\)/);
  assert.match(action, /confirmBookImport[\s\S]+validateRows\(csvText, "commit"\)/);
});

test("bulk import detects existing duplicates and serializes repeated requests", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const importFunction = migration.match(
    /create or replace function public\.admin_import_affiliate_books[\s\S]+?\n\$\$;/i,
  )?.[0];

  assert.ok(importFunction);
  assert.match(importFunction, /pg_advisory_xact_lock/i);
  assert.match(importFunction, /lower\(btrim\(title\)\) = lower\(btrim\(book_name_value\)\)/i);
  assert.match(importFunction, /where url = affiliate_url_value/i);
  assert.match(importFunction, /where slug = slug_value/i);
  assert.match(importFunction, /if not p_commit then[\s\S]+status := 'ready'/i);
  assert.doesNotMatch(importFunction, /\bupdate\s+public\.products\b/i);
});

test("bulk import keeps row inserts atomic while returning partial failures", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const importFunction = migration.match(
    /create or replace function public\.admin_import_affiliate_books[\s\S]+?\n\$\$;/i,
  )?.[0];

  assert.ok(importFunction);
  assert.match(
    importFunction,
    /begin\s+insert into public\.products[\s\S]+insert into public\.affiliate_links[\s\S]+exception\s+when unique_violation[\s\S]+when check_violation or foreign_key_violation or not_null_violation/i,
  );
  assert.match(importFunction, /status := 'failed'/i);
  assert.match(importFunction, /is_published[\s\S]+false/i);
  assert.match(importFunction, /commerce_mode[\s\S]+'affiliate'/i);
});


test("product publication state stays in sync with the admin publish control", async () => {
  const action = await readFile(
    new URL("../app/admin/actions.ts", import.meta.url),
    "utf8",
  );
  const catalog = await readFile(
    new URL("./catalog.ts", import.meta.url),
    "utf8",
  );
  const migration = await readFile(
    new URL("../../../supabase/migrations/20261111050000_enforce_published_product_status.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    action,
    /is_published: isPublishedValue === "true",[\s\S]+status: isPublishedValue === "true" \? "published" : "draft"/,
  );
  const statusFilters = catalog.match(/\.eq\("status", "published"\)/g) ?? [];
  const publishFilters = catalog.match(/\.eq\("is_published", true\)/g) ?? [];
  assert.ok(statusFilters.length >= 10);
  assert.equal(statusFilters.length, publishFilters.length);
  assert.match(
    migration,
    /alter policy "Public can resolve products with active affiliate links"[\s\S]+status = 'published'::public\.content_status/i,
  );
  assert.match(
    migration,
    /alter policy "Restrict products to published rows or admins"[\s\S]+status = 'published'::public\.content_status/i,
  );
});


test("Smart Catalog import is admin-only, transactional per row, and keeps products in draft", async () => {
  const migration = await readFile(
    new URL("../../../supabase/migrations/20261111160000_smart_catalog_bulk_import.sql", import.meta.url),
    "utf8",
  );
  const action = await readFile(
    new URL("../app/admin/import-actions.ts", import.meta.url),
    "utf8",
  );
  const parser = await readFile(new URL("./book-import-csv.mjs", import.meta.url), "utf8");

  assert.match(migration, /create or replace function public\\.admin_import_catalog_products/i);
  assert.match(migration, /security definer\\s+set search_path = ''/i);
  assert.match(migration, /role = 'admin'/i);
  assert.match(migration, /revoke all on function public\\.admin_import_catalog_products\\(jsonb,boolean\\)[\\s\\S]+grant execute on function public\\.admin_import_catalog_products\\(jsonb,boolean\\)\\s+to authenticated/i);
  assert.match(migration, /insert into public\\.product_authors/i);
  assert.match(migration, /insert into public\\.product_publishers/i);
  assert.match(migration, /insert into public\\.product_categories/i);
  assert.match(migration, /insert into public\\.curated_list_products/i);
  assert.match(migration, /false,'draft'::public\\.content_status/i);
  assert.match(action, /admin_import_catalog_products/);
  assert.match(parser, /product_name/);
  assert.match(parser, /legacyBookCsv/);
});
