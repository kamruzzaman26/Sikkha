import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminBookImport } from "@/components/admin-book-import";
import { ProductImageUpload } from "@/components/admin-product-image-upload";
import { AdminAutoDraftForm } from "@/components/admin-auto-draft-form";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { AdminIcon } from "@/components/admin-icons";
import {
  logoutAdmin,
  addProductType,
  saveAffiliateLink,
  saveProduct,
  setAffiliateLinkStatus,
  setProductArchiveStatus,
  softDeleteAffiliateLink,
  restoreAffiliateLink,
} from "./actions";
import { requireAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Affiliate & Catalog Management | Sikkha Nogori",
  robots: { index: false, follow: false },
};

const partnerNames = {
  rokomari: "Rokomari",
  "10_minute_school": "10 Minute School",
} as const;

function getPartnerName(partner: string | null): string | undefined {
  if (partner === "rokomari") {
    return partnerNames.rokomari;
  }
  if (partner === "10_minute_school") {
    return partnerNames["10_minute_school"];
  }

  return undefined;
}

const statusMessages: Record<string, string> = {
  activated: "Affiliate link activated successfully.",
  created: "Affiliate link created successfully.",
  deactivated: "Affiliate link deactivated successfully.",
  invalid:
    "Please verify the HTTPS URL, approved partner domain, and selected product.",
  "link-not-found": "The link was not found or is no longer editable.",
  "link-deleted": "Affiliate link moved to Deleted Links. It can be restored.",
  "link-restored": "Affiliate link restored. Its previous active/inactive status is preserved.",
  "partner-domain-unconfigured":
    "No approved hostname is configured for this partner. Add a verified hostname in the database.",
  "product-created": "Product added to the catalog.",
  "product-exists": "A product with this URL slug already exists.",
  "product-invalid": "Please verify the product details.",
  "product-not-found": "The selected product was not found.",
  "product-not-affiliate":
    "Mark this product as an affiliate product before creating an active affiliate link.",
  "product-archived": "Product archived. Historical orders remain unchanged.",
  "product-restored": "Product restored from archive. Publish it separately if it should appear in the public catalog.",
  "product-updated": "Catalog product updated successfully.",
  "product-type-created": "New product type added.",
  "product-type-exists": "A product type with this slug already exists.",
  "product-type-invalid": "Please verify the product type and display name.",
  "deactivate-links-first":
    "Deactivate this product’s active affiliate links before changing its sales mode.",
  forbidden: "You do not have permission to perform this action.",
  updated: "Affiliate link updated successfully.",
};

type ProductFormValue = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  price?: number;
  cost_price?: number | null;
  affiliate_commission_type?: "none" | "percentage" | "fixed";
  affiliate_commission_value?: number;
  pricing_mode?: "manual" | "automatic";
  markup_percent?: number;
  list_price?: number | null;
  edition?: string | null;
  isbn?: string | null;
  page_count?: number | null;
  language?: string | null;
  country?: string | null;
  weight_kg?: number | string | null;
  product_type?: string;
  category?: string | null;
  author?: string | null;
  publisher?: string | null;
  image_url?: string | null;
  commerce_mode?: "affiliate" | "direct" | null;
  is_published?: boolean;
  archived_at?: string | null;
};

type CategoryOption = { id: string; label: string; group: string };
type EntityKind = "authors" | "publishers" | "brands" | "creators";
type EntityOption = { id: string; name: string; is_active: boolean };
type EntityOptions = Record<EntityKind, EntityOption[]>;
type EntitySelections = Record<EntityKind, string[]>;
type EntityPrimaries = Record<EntityKind, string>;

function EntitySelector({
  kind,
  label,
  options,
  selectedIds,
  primaryId,
}: {
  kind: EntityKind;
  label: string;
  options: EntityOption[];
  selectedIds: string[];
  primaryId: string;
}) {
  const inputName = `${kind}Ids`;
  const primaryName = `${kind}PrimaryId`;
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">{label}</legend>
      {options.length === 0 ? (
        <p className="text-xs text-slate-500">No active entries. Add them in Catalog Entities.</p>
      ) : (
        <>
          <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
            {options.map((option) => (
              <label key={option.id} className="flex min-h-9 items-start gap-2 text-sm">
                <input type="checkbox" name={inputName} value={option.id} defaultChecked={selectedIds.includes(option.id)} className="mt-1 size-4" />
                <span>{option.name}{option.is_active ? "" : " (Inactive)"}</span>
              </label>
            ))}
          </div>
          <label className="mt-3 grid gap-1 text-xs font-semibold text-slate-600">
            Primary selection
            <select name={primaryName} defaultValue={primaryId} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">
              <option value="">First selected</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <input type="hidden" name="entityRelationsSubmitted" value="1" />
    </fieldset>
  );
}

function ProductForm({
  product,
  idPrefix,
  productTypes,
  categoryOptions = [],
  selectedCategoryIds = [],
  primaryCategoryId = "",
  entityOptions,
  selectedEntityIds,
  primaryEntityIds,
}: {
  product?: ProductFormValue;
  idPrefix: string;
  productTypes: Array<{ slug: string; label: string }>;
  categoryOptions?: CategoryOption[];
  selectedCategoryIds?: string[];
  primaryCategoryId?: string;
  entityOptions: EntityOptions;
  selectedEntityIds: EntitySelections;
  primaryEntityIds: EntityPrimaries;
}) {
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5";

  return (
    <AdminAutoDraftForm draftKey={product?.id ?? idPrefix} action={saveProduct} className="grid gap-4">
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-title`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Name
          </label>
          <input
            id={`${idPrefix}-title`}
            name="title"
            required
            maxLength={200}
            defaultValue={product?.title ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-slug`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            URL slug (lowercase letters and hyphens)
          </label>
          <input
            id={`${idPrefix}-slug`}
            name="slug"
            required
            maxLength={160}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            defaultValue={product?.slug ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-type`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Type
          </label>
          <select
            id={`${idPrefix}-type`}
            name="productType"
            required
            defaultValue={product?.product_type ?? "book"}
            className={inputClass}
          >
            {productTypes.map((type) => (
              <option key={type.slug} value={type.slug}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-category`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Category
          </label>
          <input
            id={`${idPrefix}-category`}
            name="category"
            maxLength={120}
            defaultValue={product?.category ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-commerce-mode`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Sales Type
          </label>
          <select
            id={`${idPrefix}-commerce-mode`}
            name="commerceMode"
            required
            defaultValue={product?.commerce_mode ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select Sales Type
            </option>
            <option value="affiliate">Third-party affiliate product</option>
            <option value="direct">Sikkha Nogori direct-sale product</option>
          </select>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-price`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Price (৳)
          </label>
          <input
            id={`${idPrefix}-price`}
            name="price"
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            defaultValue={product?.price ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Price is required for direct-sale products and optional for affiliate products. If provided,
            it will be displayed on the site. Keep it aligned with the seller’s current price
            and update it regularly.
          </p>
        </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div><label htmlFor={`${idPrefix}-cost-price`} className="mb-2 block text-sm font-semibold text-slate-700">Purchase / Cost Price (৳)</label><input id={`${idPrefix}-cost-price`} name="costPrice" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={product?.cost_price ?? ""} className={inputClass} /></div>
        <div><label htmlFor={`${idPrefix}-pricing-mode`} className="mb-2 block text-sm font-semibold text-slate-700">Pricing Mode</label><select id={`${idPrefix}-pricing-mode`} name="pricingMode" defaultValue={product?.pricing_mode ?? "manual"} className={inputClass}><option value="manual">Manual price</option><option value="automatic">Automatic from cost</option></select></div>
        <div><label htmlFor={`${idPrefix}-markup`} className="mb-2 block text-sm font-semibold text-slate-700">Profit Markup (%)</label><input id={`${idPrefix}-markup`} name="markupPercent" type="number" min="0" max="10000" step="0.01" defaultValue={product?.markup_percent ?? 0} className={inputClass} /><p className="mt-1 text-xs text-slate-500">Automatic price = cost × (1 + markup ÷ 100).</p></div>
      </div>
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-affiliate-commission-type`} className="mb-2 block text-sm font-semibold text-slate-700">Affiliate Referral Commission</label>
          <select id={`${idPrefix}-affiliate-commission-type`} name="affiliateCommissionType" defaultValue={product?.affiliate_commission_type ?? "none"} className={inputClass}>
            <option value="none">No commission</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed amount per unit (৳)</option>
          </select>
          <p className="mt-1 text-xs leading-5 text-slate-500">For direct-sale products referred by an approved Sikkha Nogori affiliate. External partner commissions are reported separately.</p>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-affiliate-commission-value`} className="mb-2 block text-sm font-semibold text-slate-700">Commission Value</label>
          <input id={`${idPrefix}-affiliate-commission-value`} name="affiliateCommissionValue" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={product?.affiliate_commission_value ?? 0} className={inputClass} />
          <p className="mt-1 text-xs text-slate-500">Percentage is capped at 100. Fixed commission is calculated per unit and cannot exceed the eligible item amount.</p>
        </div>
      </section>
        <div>
          <label
            htmlFor={`${idPrefix}-list-price`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            List Price (৳, optional)
          </label>
          <input
            id={`${idPrefix}-list-price`}
            name="listPrice"
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            defaultValue={product?.list_price ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            If provided, the crossed-out price and discount will be shown. It cannot be lower than the selling price.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor={`${idPrefix}-edition`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Edition (optional)
          </label>
          <input
            id={`${idPrefix}-edition`}
            name="edition"
            maxLength={80}
            defaultValue={product?.edition ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-isbn`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            ISBN (optional)
          </label>
          <input
            id={`${idPrefix}-isbn`}
            name="isbn"
            maxLength={30}
            defaultValue={product?.isbn ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-pageCount`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Page Count (optional)
          </label>
          <input
            id={`${idPrefix}-pageCount`}
            name="pageCount"
            type="number" min="1" max="20000" step="1"
            defaultValue={product?.page_count ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-language`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Language (optional)
          </label>
          <input
            id={`${idPrefix}-language`}
            name="language"
            maxLength={60}
            defaultValue={product?.language ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-country`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Country (optional)
          </label>
          <input
            id={`${idPrefix}-country`}
            name="country"
            maxLength={60}
            defaultValue={product?.country ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-weightKg`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Weight (kg, optional)
          </label>
          <input
            id={`${idPrefix}-weightKg`}
            name="weightKg"
            type="number" min="0" max="1000" step="0.001"
            defaultValue={product?.weight_kg ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-author`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Legacy Author Text
          </label>
          <input
            id={`${idPrefix}-author`}
            name="author"
            maxLength={160}
            defaultValue={product?.author ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-publisher`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Legacy Publisher Text
          </label>
          <input
            id={`${idPrefix}-publisher`}
            name="publisher"
            maxLength={160}
            defaultValue={product?.publisher ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-semibold text-slate-800">Catalog Relationships</p>
        <p className="text-xs text-slate-500">Select multiple entities and choose a primary entry where needed. Legacy text fields above remain for compatibility.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ["authors", "Authors"],
            ["publishers", "Publishers"],
            ["brands", "Brands"],
            ["creators", "Creators / Instructors"],
          ] as Array<[EntityKind, string]>).map(([kind, label]) => (
            <EntitySelector
              key={kind}
              kind={kind}
              label={label}
              options={entityOptions[kind]}
              selectedIds={selectedEntityIds[kind]}
              primaryId={primaryEntityIds[kind]}
            />
          ))}
        </div>
      </div>

            <ProductImageUpload idPrefix={idPrefix} initialUrl={product?.image_url ?? ""} />

      {categoryOptions.length > 0 && (
        <fieldset className="rounded-xl border border-slate-200 p-4">
          <input type="hidden" name="categoriesSubmitted" value="1" />
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Categories (select multiple)
          </legend>
          <details className="mt-1" open={selectedCategoryIds.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-brand-800">
              {selectedCategoryIds.length} selected — Open list
            </summary>
            <div className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
              {categoryOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex min-h-9 items-start gap-2 text-sm leading-6"
                >
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={option.id}
                    defaultChecked={selectedCategoryIds.includes(option.id)}
                    className="mt-1.5 size-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </details>
          <label
            htmlFor={`${idPrefix}-primary-category`}
            className="mb-1 mt-3 block text-sm font-semibold text-slate-700"
          >
            Primary Category
          </label>
          <select
            id={`${idPrefix}-primary-category`}
            name="primaryCategoryId"
            defaultValue={primaryCategoryId}
            className={inputClass}
          >
            <option value="">— First selected category —</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </fieldset>
      )}

      <div>
        <label
          htmlFor={`${idPrefix}-description`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Description
        </label>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          maxLength={5000}
          rows={3}
          defaultValue={product?.description ?? ""}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={product?.is_published ?? false}
          className="size-4 rounded border-slate-300 text-brand-700"
        />
        Publish in public catalog
      </label>

      <AdminSubmitButton pendingLabel="Saving product…" className="min-h-11 w-fit rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800">{product ? "Update Product" : "Add Product"}</AdminSubmitButton>
    </AdminAutoDraftForm>
  );
}

async function AdminContent({
  searchParams,
}: Pick<PageProps<"/admin">, "searchParams">) {
  await connection();
  const { supabase, role } = await requireAdmin("admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table names are fixed by the catalog entity schema.
  const db = supabase as unknown as { from: (table: string) => any };
  const [
    productsResult,
    linksResult,
    deletedLinksResult,
    productTypesResult,
    categoriesResult,
    productCategoriesResult,
    authorsResult,
    publishersResult,
    brandsResult,
    creatorsResult,
    productAuthorsResult,
    productPublishersResult,
    productBrandsResult,
    productCreatorsResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, title, slug, description, price, cost_price, affiliate_commission_type, affiliate_commission_value, pricing_mode, markup_percent, list_price, edition, isbn, page_count, language, country, weight_kg, product_type, category, author, publisher, image_url, commerce_mode, is_published, archived_at, created_at",
      )
      .order("title"),
    supabase
      .from("affiliate_links")
      .select(
        "id, product_id, url, partner, is_active, created_at, products(title, slug)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("affiliate_links")
      .select("id, product_id, url, partner, is_active, created_at, deleted_at, delete_reason, products(title, slug)")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("product_types")
      .select("slug, label, is_active")
      .order("label"),
    supabase
      .from("categories")
      .select("id, name, parent_id, category_group, sort_order, is_active")
      .order("category_group")
      .order("sort_order")
      .limit(2000),
    supabase
      .from("product_categories")
      .select("product_id, category_id, is_primary")
      .limit(10000),
    db.from("authors").select("id, name, is_active").order("name"),
    db.from("publishers").select("id, name, is_active").order("name"),
    db.from("brands").select("id, name, is_active").order("name"),
    db.from("creators").select("id, name, is_active").order("name"),
    db.from("product_authors").select("product_id, author_id, is_primary").limit(10000),
    db.from("product_publishers").select("product_id, publisher_id, is_primary").limit(10000),
    db.from("product_brands").select("product_id, brand_id, is_primary").limit(10000),
    db.from("product_creators").select("product_id, creator_id, is_primary").limit(10000),
  ]);

  if (productsResult.error) {
    throw new Error("Unable to load products for affiliate links.", {
      cause: productsResult.error,
    });
  }
  if (linksResult.error || deletedLinksResult.error) {
    throw new Error("Unable to load affiliate links.", {
      cause: linksResult.error ?? deletedLinksResult.error,
    });
  }
  if (productTypesResult.error) {
    throw new Error("Unable to load product types.", {
      cause: productTypesResult.error,
    });
  }
  const entityResults = [
    authorsResult, publishersResult, brandsResult, creatorsResult,
    productAuthorsResult, productPublishersResult, productBrandsResult, productCreatorsResult,
  ];
  const entityError = entityResults.find((result) => result.error)?.error;
  if (entityError) {
    throw new Error("Unable to load catalog relationships.", { cause: entityError });
  }

  if (categoriesResult.error || productCategoriesResult.error) {
    console.error(
      "Unable to load categories for the product form.",
      categoriesResult.error ?? productCategoriesResult.error,
    );
  }
  const categoryRows = categoriesResult.data ?? [];
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));
  const groupLabelsForForm: Record<string, string> = {
    books: "Books",
    products: "Products",
    electronics: "Electronics",
    courses: "Courses",
  };
  const categoryOptions: CategoryOption[] = categoryRows
    .filter((row) => row.is_active)
    .map((row) => {
      const names = [row.name];
      let cursor = row.parent_id ? categoryById.get(row.parent_id) : undefined;
      while (cursor) {
        names.unshift(cursor.name);
        cursor = cursor.parent_id ? categoryById.get(cursor.parent_id) : undefined;
      }
      return {
        id: row.id,
        group: row.category_group,
        label: `${groupLabelsForForm[row.category_group] ?? row.category_group} › ${names.join(" › ")}`,
      };
    });
  const entityOptions: EntityOptions = {
    authors: authorsResult.data ?? [],
    publishers: publishersResult.data ?? [],
    brands: brandsResult.data ?? [],
    creators: creatorsResult.data ?? [],
  };
  const selectedEntitiesByProduct: Record<EntityKind, Map<string, string[]>> = {
    authors: new Map(), publishers: new Map(), brands: new Map(), creators: new Map(),
  };
  const primaryEntitiesByProduct: Record<EntityKind, Map<string, string>> = {
    authors: new Map(), publishers: new Map(), brands: new Map(), creators: new Map(),
  };
  const addEntityRelations = (
    kind: EntityKind,
    rows: Array<{ product_id: string; entity_id: string; is_primary: boolean }>,
  ) => {
    for (const row of rows) {
      selectedEntitiesByProduct[kind].set(row.product_id, [
        ...(selectedEntitiesByProduct[kind].get(row.product_id) ?? []),
        row.entity_id,
      ]);
      if (row.is_primary) primaryEntitiesByProduct[kind].set(row.product_id, row.entity_id);
    }
  };
  addEntityRelations("authors", (productAuthorsResult.data ?? []).map((row: { product_id: string; author_id: string; is_primary: boolean }) => ({ product_id: row.product_id, entity_id: row.author_id, is_primary: row.is_primary })));
  addEntityRelations("publishers", (productPublishersResult.data ?? []).map((row: { product_id: string; publisher_id: string; is_primary: boolean }) => ({ product_id: row.product_id, entity_id: row.publisher_id, is_primary: row.is_primary })));
  addEntityRelations("brands", (productBrandsResult.data ?? []).map((row: { product_id: string; brand_id: string; is_primary: boolean }) => ({ product_id: row.product_id, entity_id: row.brand_id, is_primary: row.is_primary })));
  addEntityRelations("creators", (productCreatorsResult.data ?? []).map((row: { product_id: string; creator_id: string; is_primary: boolean }) => ({ product_id: row.product_id, entity_id: row.creator_id, is_primary: row.is_primary })));

  const selectedByProduct = new Map<string, string[]>();
  const primaryByProduct = new Map<string, string>();
  for (const link of productCategoriesResult.data ?? []) {
    selectedByProduct.set(link.product_id, [
      ...(selectedByProduct.get(link.product_id) ?? []),
      link.category_id,
    ]);
    if (link.is_primary) {
      primaryByProduct.set(link.product_id, link.category_id);
    }
  }

  const params = await searchParams;
  const statusValue = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const statusMessage =
    statusValue && Object.hasOwn(statusMessages, statusValue)
      ? statusMessages[statusValue]
      : undefined;
  const products = productsResult.data;
  const links = linksResult.data;
  const deletedLinks = deletedLinksResult.data;
  const productQueryValue = Array.isArray(params.productQuery)
    ? params.productQuery[0]
    : params.productQuery;
  const productQueryInput = productQueryValue?.slice(0, 200) ?? "";
  const productQuery = productQueryInput.trim().toLocaleLowerCase("bn");
  const productTypeValue = Array.isArray(params.productTypeFilter)
    ? params.productTypeFilter[0]
    : params.productTypeFilter;
  const productTypeFilter =
    productTypesResult.data.some((type) => type.slug === productTypeValue)
      ? productTypeValue
      : "all";
  const publicationValue = Array.isArray(params.publicationFilter)
    ? params.publicationFilter[0]
    : params.publicationFilter;
  const publicationFilter =
    publicationValue === "published" || publicationValue === "draft"
      ? publicationValue
      : "all";
  const archivedValue = Array.isArray(params.archivedFilter)
    ? params.archivedFilter[0]
    : params.archivedFilter;
  const archivedFilter =
    archivedValue === "archived" || archivedValue === "active"
      ? archivedValue
      : "all";
  const filteredProducts = products.filter((product) => {
    const matchesType =
      productTypeFilter === "all" ||
      product.product_type === productTypeFilter;
    const matchesPublication =
      publicationFilter === "all" ||
      product.is_published === (publicationFilter === "published");
    const matchesArchive =
      archivedFilter === "all" ||
      Boolean(product.archived_at) === (archivedFilter === "archived");
    const searchableFields = [
      product.title,
      product.slug,
      product.description,
      product.category,
      product.author,
      product.publisher,
    ];
    const matchesQuery =
      !productQuery ||
      searchableFields.some((value) =>
        value?.toLocaleLowerCase("bn").includes(productQuery),
      );

    return matchesType && matchesPublication && matchesArchive && matchesQuery;
  });
  const hasProductFilters =
    productQuery !== "" ||
    productTypeFilter !== "all" ||
    publicationFilter !== "all" ||
    archivedFilter !== "all";
  const sortValue = Array.isArray(params.productSort) ? params.productSort[0] : params.productSort;
  const productSort = ["name-desc", "price-asc", "price-desc", "newest"].includes(sortValue ?? "") ? (sortValue as string) : "name-asc";
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = a.price == null ? Number.POSITIVE_INFINITY : Number(a.price);
    const priceB = b.price == null ? Number.POSITIVE_INFINITY : Number(b.price);
    switch (productSort) {
      case "name-desc": return (b.title ?? "").localeCompare(a.title ?? "", "bn");
      case "price-asc": return priceA - priceB;
      case "price-desc": return (b.price == null ? -1 : priceB) - (a.price == null ? -1 : priceA);
      case "newest": return String((b as { created_at?: string }).created_at ?? "").localeCompare(String((a as { created_at?: string }).created_at ?? ""));
      default: return (a.title ?? "").localeCompare(b.title ?? "", "bn");
    }
  });
  const PAGE_SIZE = 20;
  const pageValue = Array.isArray(params.productPage) ? params.productPage[0] : params.productPage;
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.max(1, Number.parseInt(pageValue ?? "1", 10) || 1));
  const pagedProducts = sortedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageHref = (page: number) => {
    const q = new URLSearchParams();
    if (productQueryInput) q.set("productQuery", productQueryInput);
    if (productTypeFilter !== "all") q.set("productTypeFilter", productTypeFilter ?? "");
    if (publicationFilter !== "all") q.set("publicationFilter", publicationFilter);
    if (archivedFilter !== "all") q.set("archivedFilter", archivedFilter);
    if (productSort !== "name-asc") q.set("productSort", productSort);
    if (page > 1) q.set("productPage", String(page));
    const qs = q.toString();
    return `/admin${qs ? `?${qs}` : ""}#product-catalog`;
  };
  const productTypes = productTypesResult.data
    .filter((type) => type.is_active)
    .map(({ slug, label }) => ({ slug, label }));
  const productGroups = productTypesResult.data
    .map(({ slug, label, is_active }) => ({
      slug,
      title: is_active ? label : `${label} · Inactive`,
      entries: pagedProducts.filter(
        (product) => product.product_type === slug,
      ),
    }))
    .filter(
      ({ slug, entries }) =>
        entries.length > 0 || productTypeFilter === slug,
    );
  const affiliateProducts = products.filter(
    (product) =>
      product.commerce_mode === "affiliate" && !product.archived_at,
  );

  return (
    <main lang="en" className="min-h-screen bg-[#f4f7ff] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[#101b35] px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">PRODUCT MANAGEMENT</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
                Products &amp; Affiliate Links
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/80">
                Organize your product catalog, partner links, categories, and product details. Third-party
                seller products are not available for direct checkout.
              </p>
            </div>
            <div className="relative flex flex-wrap gap-2.5">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                View storefront
              </Link>
              <form action={logoutAdmin}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        {role === "admin" && (
          <section aria-label="Quick actions" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { href: "/admin/payments", label: "Payment Methods", icon: "payments" as const, note: "Configure payment options" },
              { href: "/admin/orders", label: "Manage Orders", icon: "orders" as const, note: "Review and process orders" },
              { href: "/admin/affiliates", label: "Affiliate Accounts", icon: "affiliates" as const, note: "Manage partner accounts" },
              { href: "/admin/users", label: "Manage Users", icon: "customers" as const, note: "View customer accounts" },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="group flex min-h-[92px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800 transition group-hover:bg-[#1f44ae] group-hover:text-white"><AdminIcon name={action.icon} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-slate-900">{action.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{action.note}</span>
                </span>
                <span className="ml-auto text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-700">→</span>
              </Link>
            ))}
          </section>
        )}

        {role === "admin" && (
          <section aria-label="Catalog overview" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total products", value: products.length, icon: "products" as const },
              { label: "Published products", value: products.filter((product) => product.is_published && !product.archived_at).length, icon: "view" as const },
              { label: "Draft products", value: products.filter((product) => !product.is_published && !product.archived_at).length, icon: "edit" as const },
              { label: "Active affiliate links", value: links.filter((link) => link.is_active).length, icon: "affiliates" as const },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-600">{card.label}</p>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><AdminIcon name={card.icon} /></span>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-slate-900">{card.value}</p>
              </div>
            ))}
          </section>
        )}

        {statusMessage && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 font-medium text-brand-900"
          >
            {statusMessage}
          </p>
        )}

        {role === "admin" && <AdminBookImport />}

        {role === "admin" && (
        <section
          id="product-catalog"
          className="mt-7 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-xl font-bold">Product Catalog</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Published and categorized products appear in the public catalog. Affiliate product prices are not treated as verified current prices. For direct-sale products,
            enter a verified selling price.
          </p>

          {role === "admin" && (
            <details className="group mt-5 rounded-xl border border-slate-200 bg-white open:bg-slate-50/70">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-brand-800 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2"><AdminIcon name="add" className="size-4" />Add a product to catalog</span>
                <AdminIcon name="chevron" className="size-4 transition group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-200 p-4">
                <ProductForm
                  idPrefix="new-product"
                  productTypes={productTypes}
                  categoryOptions={categoryOptions}
                  entityOptions={entityOptions}
                  selectedEntityIds={{ authors: [], publishers: [], brands: [], creators: [] }}
                  primaryEntityIds={{ authors: "", publishers: "", brands: "", creators: "" }}
                />
              </div>
            </details>
          )}

          <form
            action="/admin"
            method="get"
            role="search"
            className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem_9rem_auto] sm:items-end"
          >
            <div>
              <label
                htmlFor="admin-product-query"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search name, slug, category, author, publisher, or description
              </label>
              <input
                id="admin-product-query"
                name="productQuery"
                type="search"
                defaultValue={productQueryInput}
                className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label
                htmlFor="admin-product-type"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Product Type
              </label>
              <select
                id="admin-product-type"
                name="productTypeFilter"
                defaultValue={productTypeFilter}
                className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Types</option>
                {productTypes.map((type) => (
                  <option key={type.slug} value={type.slug}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="admin-product-archive"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Archive Status
              </label>
              <select
                id="admin-product-archive"
                name="archivedFilter"
                defaultValue={archivedFilter}
                className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Products</option>
                <option value="active">Not Archived</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="admin-product-publication"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Publication Status
              </label>
              <select
                id="admin-product-publication"
                name="publicationFilter"
                defaultValue={publicationFilter}
                className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label htmlFor="admin-product-sort" className="mb-1.5 block text-sm font-semibold text-slate-800">Sort by</label>
              <select id="admin-product-sort" name="productSort" defaultValue={productSort} className="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="price-asc">Price low → high</option>
                <option value="price-desc">Price high → low</option>
                <option value="newest">Newest first</option>
              </select>
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Apply Filters
            </button>
            {hasProductFilters && (
              <Link
                href="/admin#product-catalog"
                className="min-h-11 content-center text-sm font-semibold text-brand-800 underline underline-offset-2 sm:col-span-full"
              >
                Clear Filters
              </Link>
            )}
          </form>

          <p aria-live="polite" className="mt-4 text-sm text-slate-600">
            Showing {pagedProducts.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{(currentPage - 1) * PAGE_SIZE + pagedProducts.length} of {filteredProducts.length} matching · {products.length} total
          </p>

          <div className="mt-6 grid gap-8">
            {productGroups.map(({ slug, title, entries }) => (
              <section key={slug} aria-label={`${title} catalog`}>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{title}</h3>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-700">{entries.length}</span>
                </div>
                {entries.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                    {hasProductFilters
                      ? `No ${title} match the selected filters.`
                      : `No ${title} have been added yet.`}
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {entries.map((product) => {
                      const state = product.archived_at ? "Archived" : product.is_published ? "Published" : "Draft";
                      const stateClass = product.archived_at
                        ? "bg-slate-200 text-slate-800"
                        : product.is_published
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-900";
                      const channel = product.commerce_mode
                        ? product.commerce_mode === "affiliate"
                          ? { label: "Affiliate", className: "bg-violet-100 text-violet-800" }
                          : { label: "Direct sale", className: "bg-sky-100 text-sky-800" }
                        : { label: "Sales type required", className: "bg-rose-100 text-rose-800" };
                      return (
                        <li key={product.id} className="p-4 sm:p-5">
                          <div className="flex gap-4">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={`${product.title} cover image`}
                                width={56}
                                height={76}
                                unoptimized
                                className="h-[76px] w-14 shrink-0 rounded-lg bg-slate-100 object-cover"
                              />
                            ) : (
                              <div
                                role="img"
                                aria-label={`${product.title} image unavailable`}
                                className="flex h-[76px] w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-1 text-center text-[10px] font-semibold leading-3 text-slate-500"
                              >
                                No image
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{product.title}</p>
                                <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${stateClass}`}>{state}</span>
                                <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${channel.className}`}>{channel.label}</span>
                              </div>
                              {product.category && (
                                <p className="mt-1 text-sm font-medium text-brand-700">{product.category}</p>
                              )}
                              {(product.author || product.publisher) && (
                                <p className="mt-0.5 line-clamp-1 text-sm text-slate-600">
                                  {[product.author, product.publisher].filter(Boolean).join(" · ")}
                                </p>
                              )}
                              <p className="mt-1 break-all font-mono text-xs text-slate-500">{product.slug}</p>
                            </div>
                          </div>
                          {role === "admin" && (
                            <div className="mt-4 flex flex-wrap items-start gap-2">
                              <details className="group min-w-0 flex-1 basis-64 rounded-xl border border-slate-200 bg-white open:bg-slate-50/70">
                                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-brand-800 [&::-webkit-details-marker]:hidden">
                                  <span className="inline-flex items-center gap-2"><AdminIcon name="edit" className="size-4" />Edit product details</span>
                                  <AdminIcon name="chevron" className="size-4 transition group-open:rotate-180" />
                                </summary>
                                <div className="border-t border-slate-200 p-4">
                                  <ProductForm
                                    product={product}
                                    idPrefix={`product-${product.id}`}
                                    productTypes={productTypes}
                                    categoryOptions={categoryOptions}
                                    selectedCategoryIds={selectedByProduct.get(product.id) ?? []}
                                    primaryCategoryId={primaryByProduct.get(product.id) ?? ""}
                                    entityOptions={entityOptions}
                                    selectedEntityIds={{
                                      authors: selectedEntitiesByProduct.authors.get(product.id) ?? [],
                                      publishers: selectedEntitiesByProduct.publishers.get(product.id) ?? [],
                                      brands: selectedEntitiesByProduct.brands.get(product.id) ?? [],
                                      creators: selectedEntitiesByProduct.creators.get(product.id) ?? [],
                                    }}
                                    primaryEntityIds={{
                                      authors: primaryEntitiesByProduct.authors.get(product.id) ?? "",
                                      publishers: primaryEntitiesByProduct.publishers.get(product.id) ?? "",
                                      brands: primaryEntitiesByProduct.brands.get(product.id) ?? "",
                                      creators: primaryEntitiesByProduct.creators.get(product.id) ?? "",
                                    }}
                                  />
                                </div>
                              </details>
                              <form action={setProductArchiveStatus} className="shrink-0">
                                <input type="hidden" name="id" value={product.id} />
                                <input type="hidden" name="archive" value={product.archived_at ? "false" : "true"} />
                                <AdminSubmitButton
                                  pendingLabel={product.archived_at ? "Restoring…" : "Archiving…"}
                                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  {product.archived_at ? "Restore from archive" : "Archive product"}
                                </AdminSubmitButton>
                              </form>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Product pages" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-600">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                {currentPage > 1 ? <Link href={pageHref(currentPage - 1)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">← Previous</Link> : <span className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400">← Previous</span>}
                {currentPage < totalPages ? <Link href={pageHref(currentPage + 1)} className="min-h-10 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">Next →</Link> : <span className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400">Next →</span>}
              </div>
            </nav>
          )}
        </section>
        )}

        {role === "admin" && (
          <section className="mt-7 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">Add Product Type</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              New types become available in product forms. Types already in use
              cannot be deleted.
            </p>
            <form
              action={addProductType}
              className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
            >
              <div>
                <label
                  htmlFor="new-product-type-label"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Type Name
                </label>
                <input
                  id="new-product-type-label"
                  name="label"
                  required
                  maxLength={120}
                  className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label
                  htmlFor="new-product-type-slug"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  URL slug
                </label>
                <input
                  id="new-product-type-slug"
                  name="slug"
                  required
                  maxLength={80}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Add Type
              </button>
            </form>
          </section>
        )}

        <section className="mt-7 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Create Affiliate Link</h2>
          {affiliateProducts.length === 0 ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 leading-6 text-amber-900">
              First, save a product with the Affiliate sales mode.
            </p>
          ) : (
            <form action={saveAffiliateLink} className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="new-product"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Product
                  </label>
                  <select
                    id="new-product"
                    name="productId"
                    required
                    defaultValue=""
                    className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="" disabled>
                      Select a product
                    </option>
                    {affiliateProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title} · {product.slug}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-partner"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Affiliate Partner
                  </label>
                  <select
                    id="new-partner"
                    name="partner"
                    required
                    defaultValue=""
                    className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="" disabled>
                      Select a partner
                    </option>
                    {Object.entries(partnerNames).map(([value, name]) => (
                      <option key={value} value={value}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-url"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Approved Affiliate URL (HTTPS)
                </label>
                <input
                  id="new-url"
                  name="url"
                  type="url"
                  inputMode="url"
                  required
                  maxLength={2048}
                  placeholder="https://..."
                  className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="w-fit min-h-11 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Create Link
              </button>
            </form>
          )}
        </section>

        <section className="mt-7 rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 className="text-xl font-bold">Saved Affiliate Links</h2>
            <p className="mt-1 text-sm text-slate-600">{links.length} links total</p>
          </div>

          {links.length === 0 ? (
            <p className="m-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-slate-600 sm:m-6">
              No affiliate links have been created yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {links.map((link) => {
                const partnerName = getPartnerName(link.partner);
                // A many-to-one embed returns one object, not an array.
                const embedded = link.products as
                  | { title?: string }
                  | { title?: string }[]
                  | null
                  | undefined;
                const embeddedTitle = Array.isArray(embedded) ? embedded[0]?.title : embedded?.title;
                const linkedTitle =
                  embeddedTitle ??
                  products.find((p) => p.id === link.product_id)?.title ??
                  "Product not found";

                return (
                  <li key={link.id} className="px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                      <div className="min-w-0 flex-1 basis-64">
                        <p className="font-semibold text-slate-900">{linkedTitle}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {partnerName ?? "No partner"}
                          </span>
                          {link.url.startsWith("https://") ? (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-0 max-w-full truncate font-mono text-xs text-brand-700 hover:underline"
                            >
                              {link.url}
                            </a>
                          ) : (
                            <span className="min-w-0 max-w-full truncate font-mono text-xs">{link.url}</span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
                          link.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {link.is_active ? "Active" : "Inactive"}
                      </span>
                      <form action={setAffiliateLinkStatus}>
                        <input type="hidden" name="id" value={link.id} />
                        <input type="hidden" name="isActive" value={link.is_active ? "false" : "true"} />
                        <button
                          type="submit"
                          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          {link.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                                            <details className="shrink-0 rounded-xl border border-rose-200 bg-white">
                        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-rose-700">Delete</summary>
                        <form action={softDeleteAffiliateLink} className="grid gap-2 border-t border-rose-100 p-3">
                          <input type="hidden" name="id" value={link.id} />
                          <label htmlFor={`delete-reason-${link.id}`} className="text-xs font-semibold text-slate-700">Reason (optional)</label>
                          <input id={`delete-reason-${link.id}`} name="reason" maxLength={300} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm" />
                          <p className="text-xs text-slate-500">This moves the link to Deleted Links; it does not permanently erase it.</p>
                          <button type="submit" className="min-h-10 rounded-lg bg-rose-700 px-3 text-sm font-semibold text-white">Confirm delete</button>
                        </form>
                      </details>
                    </div>

                    <details className="group mt-3 rounded-xl border border-slate-200 bg-white open:bg-slate-50/70">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-brand-800 [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2"><AdminIcon name="edit" className="size-4" />Edit link</span>
                        <AdminIcon name="chevron" className="size-4 transition group-open:rotate-180" />
                      </summary>
                      <form action={saveAffiliateLink} className="grid gap-4 border-t border-slate-200 p-4">
                        <input type="hidden" name="id" value={link.id} />
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label htmlFor={`product-${link.id}`} className="mb-2 block text-sm font-semibold text-slate-700">
                              Products
                            </label>
                            <select
                              id={`product-${link.id}`}
                              name="productId"
                              required
                              defaultValue={link.product_id}
                              className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.product_type === "course" ? "Course" : "Book"}: {product.title} · {product.slug}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor={`partner-${link.id}`} className="mb-2 block text-sm font-semibold text-slate-700">
                              Affiliate Partner
                            </label>
                            <select
                              id={`partner-${link.id}`}
                              name="partner"
                              required
                              defaultValue={link.partner ?? ""}
                              className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="" disabled>
                                Select a partner
                              </option>
                              {Object.entries(partnerNames).map(([value, name]) => (
                                <option key={value} value={value}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`url-${link.id}`} className="mb-2 block text-sm font-semibold text-slate-700">
                            Affiliate URL (HTTPS)
                          </label>
                          <input
                            id={`url-${link.id}`}
                            name="url"
                            type="url"
                            inputMode="url"
                            required
                            maxLength={2048}
                            defaultValue={link.url}
                            className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <div>
                          <button
                            type="submit"
                            className="min-h-11 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800"
                          >
                            Save changes
                          </button>
                        </div>
                      </form>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-7 rounded-2xl border border-rose-200 bg-white shadow-sm">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 className="text-xl font-bold">Deleted Affiliate Links</h2>
            <p className="mt-1 text-sm text-slate-600">{deletedLinks.length} deleted links · Restoring keeps the previous active/inactive state.</p>
          </div>
          {deletedLinks.length === 0 ? (
            <p className="m-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600 sm:m-6">No deleted affiliate links.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {deletedLinks.map((link) => {
                const embedded = link.products as { title?: string } | { title?: string }[] | null | undefined;
                const title = Array.isArray(embedded) ? embedded[0]?.title : embedded?.title;
                return (
                  <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{title ?? "Product not found"}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{getPartnerName(link.partner) ?? "No partner"} · {link.url}</p>
                      {link.delete_reason && <p className="mt-1 text-xs text-slate-500">Reason: {link.delete_reason}</p>}
                      <p className="mt-1 text-xs text-slate-500">Deleted {link.deleted_at ? new Date(link.deleted_at).toLocaleString("en-GB") : "Date unavailable"}</p>
                    </div>
                    <form action={restoreAffiliateLink}>
                      <input type="hidden" name="id" value={link.id} />
                      <button type="submit" className="min-h-11 rounded-xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Restore</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default function AdminPage({
  searchParams,
}: PageProps<"/admin">) {
  return (
    <Suspense
      fallback={
        <main lang="en" className="min-h-screen bg-[#f4f6fa] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-5xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-40 rounded-xl bg-slate-100" />
            <div className="mt-6 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}
