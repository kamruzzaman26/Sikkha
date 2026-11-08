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

function ProductForm({
  product,
  idPrefix,
  productTypes,
  categoryOptions = [],
  selectedCategoryIds = [],
  primaryCategoryId = "",
}: {
  product?: ProductFormValue;
  idPrefix: string;
  productTypes: Array<{ slug: string; label: string }>;
  categoryOptions?: CategoryOption[];
  selectedCategoryIds?: string[];
  primaryCategoryId?: string;
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
            Author or Brand
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
            Publisher or Brand
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

      <ProductImageUpload idPrefix={idPrefix} initialUrl={product?.image_url ?? ""} />

      {categoryOptions.length > 0 && (
        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
          <input type="hidden" name="categoriesSubmitted" value="1" />
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Categories (select multiple)
          </legend>
          <details className="mt-1" open={selectedCategoryIds.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
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
          className="size-4 rounded border-slate-300 text-emerald-700"
        />
        Publish in public catalog
      </label>

      <AdminSubmitButton pendingLabel="Saving product…" className="w-fit rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800">{product ? "Update Product" : "Add Product"}</AdminSubmitButton>
    </AdminAutoDraftForm>
  );
}

async function AdminContent({
  searchParams,
}: Pick<PageProps<"/admin">, "searchParams">) {
  await connection();
  const { supabase, role } = await requireAdmin("admin");
  const [
    productsResult,
    linksResult,
    productTypesResult,
    categoriesResult,
    productCategoriesResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, title, slug, description, price, cost_price, pricing_mode, markup_percent, list_price, edition, isbn, page_count, language, country, weight_kg, product_type, category, author, publisher, image_url, commerce_mode, is_published, archived_at",
      )
      .order("title"),
    supabase
      .from("affiliate_links")
      .select(
        "id, product_id, url, partner, is_active, created_at, products(title, slug)",
      )
      .order("created_at", { ascending: false }),
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
  ]);

  if (productsResult.error) {
    throw new Error("Unable to load products for affiliate links.", {
      cause: productsResult.error,
    });
  }
  if (linksResult.error) {
    throw new Error("Unable to load affiliate links.", {
      cause: linksResult.error,
    });
  }
  if (productTypesResult.error) {
    throw new Error("Unable to load product types.", {
      cause: productTypesResult.error,
    });
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
  const productTypes = productTypesResult.data
    .filter((type) => type.is_active)
    .map(({ slug, label }) => ({ slug, label }));
  const affiliateProducts = products.filter(
    (product) =>
      product.commerce_mode === "affiliate" && !product.archived_at,
  );

  return (
    <main lang="en" className="min-h-screen bg-[#f4f7ff] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[#101b35] px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9"><div className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full bg-blue-500/15 blur-3xl" /><div className="relative flex flex-wrap items-end justify-between gap-4">
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
          </div></div>
        </header>

        {role === "admin" && (
          <section aria-label="Quick actions" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { href: "/admin/payments", label: "Payment Methods", icon: "payments" as const, note: "Configure payment options" },
              { href: "/admin/orders", label: "Manage Orders", icon: "orders" as const, note: "Review and process orders" },
              { href: "/admin/affiliates", label: "Affiliate Accounts", icon: "affiliates" as const, note: "Manage partner accounts" },
              { href: "/admin/users", label: "Manage Users", icon: "customers" as const, note: "View customer accounts" },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="group flex min-h-[92px] items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition group-hover:bg-[#0a5748] group-hover:text-white"><AdminIcon name={action.icon} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-slate-900">{action.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{action.note}</span>
                </span>
                <span className="ml-auto text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-700">→</span>
              </Link>
            ))}
          </section>
        )}

        {role === "admin" && (
          <section aria-label="Catalog overview" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm text-slate-600">Total Products</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{products.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm text-slate-600">Published Products</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{products.filter((product) => product.is_published && !product.archived_at).length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm text-slate-600">Draft Products</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{products.filter((product) => !product.is_published && !product.archived_at).length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm text-slate-600">Active Affiliate Links</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{links.filter((link) => link.is_active).length}</p>
            </div>
          </section>
        )}

        {statusMessage && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-900"
          >
            {statusMessage}
          </p>
        )}

        {role === "admin" && <AdminBookImport />}

        {role === "admin" && (
        <section
          id="product-catalog"
          className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">Catalog</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Products</h2></div><a href="#affiliate-links" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-100">View Affiliate Links ↓</a></div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Published and categorized products appear in the public catalog. Affiliate product prices are not treated as verified current prices. For direct-sale products,
            enter a verified selling price.
          </p>

          {role === "admin" && (
            <details className="group mt-5 rounded-xl border border-slate-200 bg-white open:bg-slate-50/70">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl px-4 text-sm font-bold text-blue-900 [&::-webkit-details-marker]:hidden">
                Add a Product to Catalog
              </summary>
              <div className="border-t border-slate-200 p-4">
                <ProductForm
                  idPrefix="new-product"
                  productTypes={productTypes}
                  categoryOptions={categoryOptions}
                />
              </div>
            </details>
          )}

          <form
            action="/admin"
            method="get"
            role="search"
            className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem_auto] sm:items-end"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Apply Filters
            </button>
            {hasProductFilters && (
              <Link
                href="/admin#product-catalog"
                className="min-h-11 content-center text-sm font-semibold text-emerald-800 underline underline-offset-2 sm:col-span-full"
              >
                Clear Filters
              </Link>
            )}
          </form>

          <p aria-live="polite" className="mt-4 text-sm text-slate-600">
            Showing {filteredProducts.length} products · {products.length} total
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead className="bg-blue-50/80 text-slate-800">
                  <tr>
                    <th className="px-4 py-4 font-bold">Product</th>
                    <th className="px-4 py-4 font-bold">Category / Type</th>
                    <th className="px-4 py-4 font-bold">Price</th>
                    <th className="px-4 py-4 font-bold">Status</th>
                    <th className="px-4 py-4 font-bold">Affiliate Links</th>
                    <th className="px-4 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const productLinks = links.filter((link) => link.product_id === product.id);
                    return (
                      <tr key={product.id} className="align-middle transition hover:bg-blue-50/40">
                        <td className="px-4 py-3">
                          <div className="flex min-w-[230px] items-center gap-3">
                            {product.image_url ? (
                              <Image src={product.image_url} alt="" width={48} height={60} className="h-[60px] w-12 rounded-lg bg-slate-100 object-cover" />
                            ) : (
                              <div className="flex h-[60px] w-12 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-semibold text-blue-800">No image</div>
                            )}
                            <div className="min-w-0">
                              <p className="line-clamp-2 font-bold text-slate-900">{product.title}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{product.category || product.product_type}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold tabular-nums text-slate-900">{product.price != null ? `৳ ${Number(product.price).toLocaleString("en-BD")}` : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${product.archived_at ? "bg-slate-100 text-slate-600" : product.is_published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {product.archived_at ? "Archived" : product.is_published ? "Published" : "Draft"}
                          </span>
                          <p className="mt-1 text-xs text-slate-500">{product.commerce_mode === "affiliate" ? "Affiliate" : product.commerce_mode === "direct" ? "Direct sale" : "Sales type required"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <a href="#affiliate-links" className="font-semibold text-blue-700 hover:underline">{productLinks.length} {productLinks.length === 1 ? "link" : "links"}</a>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <details className="group relative">
                              <summary className="cursor-pointer list-none rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Edit</summary>
                              <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 p-3 sm:p-8">
                                <div className="mx-auto my-4 max-w-4xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
                                  <div className="mb-5 flex items-center justify-between gap-3">
                                    <h3 className="text-lg font-extrabold text-slate-900">Edit product</h3>
                                    <button type="button" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Close</button>
                                  </div>
                                  <ProductForm product={product} idPrefix={`product-${product.id}`} productTypes={productTypes} categoryOptions={categoryOptions} selectedCategoryIds={selectedByProduct.get(product.id) ?? []} primaryCategoryId={primaryByProduct.get(product.id) ?? ""} />
                                  <form action={setProductArchiveStatus} className="mt-4 border-t border-slate-100 pt-4">
                                    <input type="hidden" name="id" value={product.id} />
                                    <input type="hidden" name="archive" value={product.archived_at ? "false" : "true"} />
                                    <AdminSubmitButton pendingLabel={product.archived_at ? "Restoring…" : "Archiving…"} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{product.archived_at ? "Restore from Archive" : "Archive Product"}</AdminSubmitButton>
                                  </form>
                                </div>
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">{hasProductFilters ? "No products match these filters." : "No products have been added yet."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-600">
              <span>Showing {filteredProducts.length} of {products.length} products</span>
              <a href="#product-catalog" className="font-semibold text-blue-700 hover:underline">Back to filters ↑</a>
            </div>
          </div>
        </section>
        )}

        {role === "admin" && (
          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-extrabold text-slate-900">Manage Product Types</h2>
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <button
                type="submit"
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
              >
                Add Type
              </button>
            </form>
          </section>
        )}

        <section id="affiliate-links" className="mt-8 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">Partner tracking</p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">Affiliate Links</h2>
              <p className="mt-1 text-sm text-slate-600">Manage approved partner URLs connected to your catalog products.</p>
            </div>
            <details className="group">
              <summary className="cursor-pointer list-none rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800">+ Add Affiliate Link</summary>
              <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 p-3 sm:p-8">
                <div className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-extrabold text-slate-900">Create Affiliate Link</h3>
                    <button type="button" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Close</button>
                  </div>
                  {affiliateProducts.length === 0 ? (
                    <p className="rounded-xl bg-amber-50 px-4 py-3 leading-6 text-amber-900">First, save a product with the Affiliate sales mode.</p>
                  ) : (
                    <form action={saveAffiliateLink} className="grid gap-4">
                      <div>
                        <label htmlFor="new-product" className="mb-2 block text-sm font-semibold text-slate-700">Product</label>
                        <select id="new-product" name="productId" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3">
                          <option value="" disabled>Select a product</option>
                          {affiliateProducts.map((product) => <option key={product.id} value={product.id}>{product.title} · {product.slug}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="new-partner" className="mb-2 block text-sm font-semibold text-slate-700">Affiliate Partner</label>
                        <select id="new-partner" name="partner" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3">
                          <option value="" disabled>Select a partner</option>
                          {Object.entries(partnerNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="new-url" className="mb-2 block text-sm font-semibold text-slate-700">Approved Affiliate URL (HTTPS)</label>
                        <input id="new-url" name="url" type="url" inputMode="url" required maxLength={2048} placeholder="https://..." className="w-full rounded-xl border border-slate-300 px-3 py-3" />
                      </div>
                      <AdminSubmitButton pendingLabel="Creating link…" className="min-h-11 w-fit rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">Create Link</AdminSubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </details>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-xs font-semibold text-blue-800">Total Links</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{links.length}</p></div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4"><p className="text-xs font-semibold text-emerald-800">Active Links</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{links.filter((link) => link.is_active).length}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-600">Inactive Links</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{links.filter((link) => !link.is_active).length}</p></div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-blue-50/80 text-slate-800">
                  <tr>
                    <th className="px-4 py-4 font-bold">Product</th>
                    <th className="px-4 py-4 font-bold">Partner</th>
                    <th className="px-4 py-4 font-bold">Affiliate URL</th>
                    <th className="px-4 py-4 font-bold">Status</th>
                    <th className="px-4 py-4 font-bold">Created</th>
                    <th className="px-4 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {links.map((link) => {
                    const embedded = link.products as { title?: string } | { title?: string }[] | null | undefined;
                    const embeddedTitle = Array.isArray(embedded) ? embedded[0]?.title : embedded?.title;
                    const productTitle = embeddedTitle ?? products.find((product) => product.id === link.product_id)?.title ?? "Product not found";
                    return (
                      <tr key={link.id} className="align-middle hover:bg-blue-50/40">
                        <td className="px-4 py-3 font-bold text-slate-900">{productTitle}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{getPartnerName(link.partner) ?? "Partner not set"}</td>
                        <td className="max-w-[240px] px-4 py-3"><a href={link.url} target="_blank" rel="noreferrer" className="block truncate font-medium text-blue-700 hover:underline">{link.url}</a></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${link.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{link.is_active ? "Active" : "Inactive"}</span></td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{new Date(link.created_at).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <details className="group">
                              <summary className="cursor-pointer list-none rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Edit</summary>
                              <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 p-3 sm:p-8">
                                <div className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
                                  <div className="mb-5 flex items-center justify-between gap-3">
                                    <h3 className="text-lg font-extrabold text-slate-900">Edit Affiliate Link</h3>
                                    <button type="button" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Close</button>
                                  </div>
                                  <form action={saveAffiliateLink} className="grid gap-4">
                                    <input type="hidden" name="id" value={link.id} />
                                    <div>
                                      <label htmlFor={`product-${link.id}`} className="mb-2 block text-sm font-semibold text-slate-700">Product</label>
                                      <select id={`product-${link.id}`} name="productId" required defaultValue={link.product_id} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3">
                                        {products.map((product) => <option key={product.id} value={product.id}>{product.product_type === "course" ? "Course" : "Book"}: {product.title} · {product.slug}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label htmlFor={`partner-${link.id}`} className="mb-2 block text-sm font-semibold text-slate-700">Affiliate Partner</label>
                                      <select id={`partner-${link.id}`} name="partner" required defaultValue={link.partner ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3">
                                        <option value="" disabled>Select a partner</option>
                                        {Object.entries(partnerNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label htmlFor={`url-${link.id}`} className="mb-2 block text-sm font-semibold text-slate-700">Affiliate URL (HTTPS)</label>
                                      <input id={`url-${link.id}`} name="url" type="url" inputMode="url" required maxLength={2048} defaultValue={link.url} className="w-full rounded-xl border border-slate-300 px-3 py-3" />
                                    </div>
                                    <AdminSubmitButton pendingLabel="Saving changes…" className="min-h-11 w-fit rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">Save Changes</AdminSubmitButton>
                                  </form>
                                </div>
                              </div>
                            </details>
                            <form action={setAffiliateLinkStatus}>
                              <input type="hidden" name="id" value={link.id} />
                              <input type="hidden" name="isActive" value={link.is_active ? "false" : "true"} />
                              <AdminSubmitButton pendingLabel="Updating…" className="min-h-9 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{link.is_active ? "Deactivate" : "Activate"}</AdminSubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {links.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No affiliate links have been created yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-600">Showing {links.length} saved affiliate links</div>
          </div>
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
        <main lang="en" className="min-h-screen bg-[#f4f6fb] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
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
