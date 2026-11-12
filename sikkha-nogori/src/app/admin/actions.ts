"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseAffiliateUrl } from "@/lib/affiliate-url.mjs";
import { parseProductImageUrl } from "@/lib/product-image-url.mjs";
import {
  logActivity,
  requireAdmin,
  requirePermission,
  verifyCurrentUserIsAdmin,
} from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const partnerValues = ["rokomari", "10_minute_school"] as const;
type AffiliatePartner = (typeof partnerValues)[number];
const commerceModes = ["affiliate", "direct"] as const;
type CommerceMode = (typeof commerceModes)[number];

function getFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isAffiliatePartner(value: string): value is AffiliatePartner {
  return partnerValues.some((partner) => partner === value);
}

function isCommerceMode(value: string): value is CommerceMode {
  return commerceModes.some((commerceMode) => commerceMode === value);
}

function parsePrice(value: string): number | undefined {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) {
    return undefined;
  }

  const price = Number(value);
  return Number.isFinite(price) && price <= 9999999999.99
    ? price
    : undefined;
}

function finishAction(status: string): never {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/books");
  revalidatePath("/books/[slug]", "page");
  revalidatePath("/courses");
  revalidatePath("/courses/[slug]", "page");
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/wishlist");
  redirect(`/admin?status=${status}`);
}

export async function loginAdmin(formData: FormData) {
  const email = getFormValue(formData, "email");
  const passwordValue = formData.get("password");
  const password =
    typeof passwordValue === "string" ? passwordValue : "";

  if (!email || !password) {
    redirect("/admin/login?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: loginError,
  } = await supabase.auth.signInWithPassword({ email, password });

  if (loginError || !user) {
    redirect("/admin/login?error=invalid");
  }

  const isAdmin = await verifyCurrentUserIsAdmin(supabase);
  if (!isAdmin) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      throw new Error("Unable to sign out an unauthorized account.", {
        cause: signOutError,
      });
    }

    redirect("/admin/login?error=unauthorized");
  }

  redirect("/admin");
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Unable to sign out.", { cause: error });
  }

  redirect("/admin/login");
}

export async function saveAffiliateLink(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const id = getFormValue(formData, "id");
  const productId = getFormValue(formData, "productId");
  const partner = getFormValue(formData, "partner");

  if (
    (id && !isUuid(id)) ||
    !isUuid(productId) ||
    !isAffiliatePartner(partner)
  ) {
    redirect("/admin?status=invalid");
  }

  const { data: partnerDomains, error: domainsError } = await supabase
    .from("affiliate_partner_domains")
    .select("hostname")
    .eq("partner", partner);

  if (domainsError) {
    throw new Error("Unable to verify the affiliate partner domain.", {
      cause: domainsError,
    });
  }

  const allowedHostnames = new Set(
    partnerDomains.map(({ hostname }) => hostname),
  );
  if (allowedHostnames.size === 0) {
    redirect("/admin?status=partner-domain-unconfigured");
  }

  const affiliateUrl = parseAffiliateUrl(
    getFormValue(formData, "url"),
    allowedHostnames,
  );
  if (!affiliateUrl) {
    redirect("/admin?status=invalid");
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, commerce_mode, archived_at")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    throw new Error("Unable to verify the selected product.", {
      cause: productError,
    });
  }

  if (!product) {
    redirect("/admin?status=product-not-found");
  }
  if (product.commerce_mode !== "affiliate" || product.archived_at) {
    redirect("/admin?status=product-not-affiliate");
  }

  const values = {
    product_id: productId,
    partner,
    url: affiliateUrl,
  };

  if (id) {
    const { data, error } = await supabase
      .from("affiliate_links")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error("Unable to update the affiliate link.", {
        cause: error,
      });
    }
    if (!data) {
      redirect("/admin?status=link-not-found");
    }

    finishAction("updated");
  }

  const { error } = await supabase
    .from("affiliate_links")
    .insert({ ...values, is_active: true });

  if (error) {
    throw new Error("Unable to add the affiliate link.", { cause: error });
  }

  finishAction("created");
}

export async function setAffiliateLinkStatus(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const id = getFormValue(formData, "id");
  const isActiveValue = getFormValue(formData, "isActive");

  if (!isUuid(id) || !["true", "false"].includes(isActiveValue)) {
    redirect("/admin?status=invalid");
  }

  if (isActiveValue === "true") {
    const { data: link, error: linkError } = await supabase
      .from("affiliate_links")
      .select("partner, url, product_id")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (linkError) {
      throw new Error("Unable to verify the affiliate link.", {
        cause: linkError,
      });
    }
    if (!link) {
      redirect("/admin?status=link-not-found");
    }
    if (!isAffiliatePartner(link.partner ?? "")) {
      redirect("/admin?status=invalid");
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("commerce_mode, archived_at")
      .eq("id", link.product_id)
      .maybeSingle();

    if (productError) {
      throw new Error("Unable to verify the affiliate product.", {
        cause: productError,
      });
    }
    if (
      !product ||
      product.commerce_mode !== "affiliate" ||
      product.archived_at
    ) {
      redirect("/admin?status=product-not-affiliate");
    }

    const { data: partnerDomains, error: domainsError } = await supabase
      .from("affiliate_partner_domains")
      .select("hostname")
      .eq("partner", link.partner);

    if (domainsError) {
      throw new Error("Unable to verify the affiliate partner domain.", {
        cause: domainsError,
      });
    }

    const allowedHostnames = new Set(
      partnerDomains.map(({ hostname }) => hostname),
    );
    if (allowedHostnames.size === 0) {
      redirect("/admin?status=partner-domain-unconfigured");
    }
    if (!parseAffiliateUrl(link.url, allowedHostnames)) {
      redirect("/admin?status=invalid");
    }
  }

  const { data, error } = await supabase
    .from("affiliate_links")
    .update({
      is_active: isActiveValue === "true",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to change the affiliate link status.", {
      cause: error,
    });
  }
  if (!data) {
    redirect("/admin?status=link-not-found");
  }

  finishAction(isActiveValue === "true" ? "activated" : "deactivated");
}

export async function softDeleteAffiliateLink(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const id = getFormValue(formData, "id");
  const reason = getFormValue(formData, "reason");

  if (!isUuid(id) || reason.length > 300) {
    redirect("/admin?status=invalid");
  }

  const { data: link, error: linkError } = await supabase
    .from("affiliate_links")
    .select("id, product_id, partner, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (linkError) {
    throw new Error("Unable to verify the affiliate link before deletion.", {
      cause: linkError,
    });
  }
  if (!link || link.deleted_at) {
    redirect("/admin?status=link-not-found");
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("affiliate_links")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id ?? null,
      delete_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new Error("Unable to move the affiliate link to deleted items.", {
      cause: error,
    });
  }

  await logActivity(supabase, "affiliate_link_deleted", "affiliate_link", id, {
    product_id: link.product_id,
    partner: link.partner,
    reason: reason || null,
  });
  finishAction("link-deleted");
}

export async function restoreAffiliateLink(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const id = getFormValue(formData, "id");

  if (!isUuid(id)) {
    redirect("/admin?status=invalid");
  }

  const { data: link, error: linkError } = await supabase
    .from("affiliate_links")
    .select("id, product_id, partner, deleted_at")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (linkError) {
    throw new Error("Unable to verify the deleted affiliate link.", {
      cause: linkError,
    });
  }
  if (!link) {
    redirect("/admin?status=link-not-found");
  }

  const { error } = await supabase
    .from("affiliate_links")
    .update({
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .not("deleted_at", "is", null);

  if (error) {
    throw new Error("Unable to restore the affiliate link.", { cause: error });
  }

  await logActivity(supabase, "affiliate_link_restored", "affiliate_link", id, {
    product_id: link.product_id,
    partner: link.partner,
  });
  finishAction("link-restored");
}

const catalogEntityTables = {
  authors: "authors",
  publishers: "publishers",
  brands: "brands",
  creators: "creators",
} as const;

type CatalogEntityKind = keyof typeof catalogEntityTables;

function isCatalogEntityKind(value: string): value is CatalogEntityKind {
  return Object.hasOwn(catalogEntityTables, value);
}

function finishCatalogEntityAction(status: string): never {
  revalidatePath("/admin/catalog-entities");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect(`/admin/catalog-entities?status=${status}`);
}

export async function saveCatalogEntity(formData: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const kind = getFormValue(formData, "entityType");
  const id = getFormValue(formData, "id");
  const name = getFormValue(formData, "name");
  const nameEn = getFormValue(formData, "nameEn");
  const slug = getFormValue(formData, "slug");

  if (
    !isCatalogEntityKind(kind) ||
    (id && !isUuid(id)) ||
    !name ||
    name.length > 160 ||
    nameEn.length > 160 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 160
  ) {
    finishCatalogEntityAction("invalid");
  }

  const values: Record<string, unknown> = {
    name,
    name_en: nameEn || null,
    slug,
    updated_at: new Date().toISOString(),
  };

  if (kind === "authors") {
    const biography = getFormValue(formData, "biography");
    const imageUrlValue = getFormValue(formData, "imageUrl");
    const imageUrl = imageUrlValue ? parseProductImageUrl(imageUrlValue) : null;
    if (biography.length > 5000 || (imageUrlValue && !imageUrl)) finishCatalogEntityAction("invalid");
    values.biography = biography || null;
    values.image_url = imageUrl;
  } else if (kind === "publishers" || kind === "brands") {
    const description = getFormValue(formData, "description");
    const logoUrlValue = getFormValue(formData, "imageUrl");
    const logoUrl = logoUrlValue ? parseProductImageUrl(logoUrlValue) : null;
    const websiteUrl = getFormValue(formData, "websiteUrl");
    if (description.length > 5000 || (logoUrlValue && !logoUrl) || (websiteUrl && (!websiteUrl.startsWith("https://") || websiteUrl.length > 2048))) finishCatalogEntityAction("invalid");
    values.description = description || null;
    values.logo_url = logoUrl;
    values.website_url = websiteUrl || null;
  } else {
    const creatorType = getFormValue(formData, "creatorType") || "other";
    const biography = getFormValue(formData, "biography");
    const imageUrlValue = getFormValue(formData, "imageUrl");
    const imageUrl = imageUrlValue ? parseProductImageUrl(imageUrlValue) : null;
    const websiteUrl = getFormValue(formData, "websiteUrl");
    if (
      !["author", "instructor", "content_creator", "artist", "other"].includes(creatorType) ||
      biography.length > 5000 ||
      (imageUrlValue && !imageUrl) ||
      (websiteUrl && (!websiteUrl.startsWith("https://") || websiteUrl.length > 2048))
    ) finishCatalogEntityAction("invalid");
    values.creator_type = creatorType;
    values.biography = biography || null;
    values.profile_image_url = imageUrl;
    values.website_url = websiteUrl || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table names are constrained by the local allowlist.
  const db = supabase as unknown as { from: (table: string) => any };
  const table = catalogEntityTables[kind];
  const query = id
    ? db.from(table).update(values).eq("id", id).select("id").maybeSingle()
    : db.from(table).insert({ ...values, is_active: true }).select("id").single();
  const { data, error } = await query;

  if (error) {
    if (error.code === "23505") finishCatalogEntityAction("exists");
    throw new Error("Unable to save the catalog entity.", { cause: error });
  }
  if (!data) finishCatalogEntityAction("not-found");

  await logActivity(
    supabase,
    id ? "catalog_entity_updated" : "catalog_entity_created",
    kind,
    id || data.id,
    { name, slug },
  );
  finishCatalogEntityAction("saved");
}

export async function setCatalogEntityStatus(formData: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const kind = getFormValue(formData, "entityType");
  const id = getFormValue(formData, "id");
  const activeValue = getFormValue(formData, "isActive");

  if (!isCatalogEntityKind(kind) || !isUuid(id) || !["true", "false"].includes(activeValue)) {
    finishCatalogEntityAction("invalid");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table names are constrained by the local allowlist.
  const db = supabase as unknown as { from: (table: string) => any };
  const { data, error } = await db
    .from(catalogEntityTables[kind])
    .update({ is_active: activeValue === "true", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error("Unable to update catalog entity status.", { cause: error });
  if (!data) finishCatalogEntityAction("not-found");

  await logActivity(supabase, activeValue === "true" ? "catalog_entity_activated" : "catalog_entity_deactivated", kind, id);
  finishCatalogEntityAction("saved");
}

function getUuidList(formData: FormData, name: string): string[] {
  return [
    ...new Set(
      formData
        .getAll(name)
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim()),
    ),
  ];
}

type ProductEntityKind = "authors" | "publishers" | "brands" | "creators";
type ProductEntitySelections = Record<ProductEntityKind, string[]>;

async function syncProductEntityRelations(
  supabase: Awaited<ReturnType<typeof requirePermission>>["supabase"],
  productId: string,
  selections: ProductEntitySelections,
  primaryIds: Record<ProductEntityKind, string>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table names are constrained by the local allowlist.
  const db = supabase as unknown as { from: (table: string) => any };
  const configs: Array<{
    kind: ProductEntityKind;
    table: string;
    foreignKey: string;
  }> = [
    { kind: "authors", table: "product_authors", foreignKey: "author_id" },
    { kind: "publishers", table: "product_publishers", foreignKey: "publisher_id" },
    { kind: "brands", table: "product_brands", foreignKey: "brand_id" },
    { kind: "creators", table: "product_creators", foreignKey: "creator_id" },
  ];

  for (const config of configs) {
    const ids = selections[config.kind];
    const primary = ids.includes(primaryIds[config.kind])
      ? primaryIds[config.kind]
      : ids[0];

    const { data: existing, error: readError } = await db
      .from(config.table)
      .select(config.foreignKey)
      .eq("product_id", productId);
    if (readError) throw new Error(`Unable to read product ${config.kind}.`, { cause: readError });

    const removed = (existing ?? [])
      .map((row: Record<string, string>) => row[config.foreignKey])
      .filter((id: string) => !ids.includes(id));
    if (removed.length > 0) {
      const { error } = await db
        .from(config.table)
        .delete()
        .eq("product_id", productId)
        .in(config.foreignKey, removed);
      if (error) throw new Error(`Unable to remove product ${config.kind}.`, { cause: error });
    }

    const { error: clearError } = await db
      .from(config.table)
      .update({ is_primary: false })
      .eq("product_id", productId);
    if (clearError) {
      throw new Error(`Unable to reset primary product ${config.kind}.`, { cause: clearError });
    }

    if (ids.length > 0) {
      const { error } = await db.from(config.table).upsert(
        ids.map((entityId) => ({
          product_id: productId,
          [config.foreignKey]: entityId,
          is_primary: entityId === primary,
        })),
        { onConflict: `product_id,${config.foreignKey}` },
      );
      if (error) throw new Error(`Unable to save product ${config.kind}.`, { cause: error });
    }
  }

  // Keep legacy public product-detail fields in sync with the selected primary
  // author/publisher so existing storefront components continue to display them.
  const legacyValues: Record<string, string | null> = {};
  const primaryAuthorId = selections.authors.includes(primaryIds.authors)
    ? primaryIds.authors
    : selections.authors[0];
  const primaryPublisherId = selections.publishers.includes(primaryIds.publishers)
    ? primaryIds.publishers
    : selections.publishers[0];

  if (primaryAuthorId) {
    const { data, error } = await db.from("authors").select("name").eq("id", primaryAuthorId).maybeSingle();
    if (error) throw new Error("Unable to load the primary author.", { cause: error });
    legacyValues.author = data?.name ?? null;
  }
  if (primaryPublisherId) {
    const { data, error } = await db.from("publishers").select("name").eq("id", primaryPublisherId).maybeSingle();
    if (error) throw new Error("Unable to load the primary publisher.", { cause: error });
    legacyValues.publisher = data?.name ?? null;
  }

  if (Object.keys(legacyValues).length > 0) {
    const { error } = await supabase
      .from("products")
      .update({ ...legacyValues, updated_at: new Date().toISOString() })
      .eq("id", productId);
    if (error) throw new Error("Unable to synchronize legacy product details.", { cause: error });
  }
}

async function syncProductCategories(
  supabase: Awaited<ReturnType<typeof requirePermission>>["supabase"],
  productId: string,
  categoryIds: string[],
  primaryId: string,
) {
  const primary = categoryIds.includes(primaryId) ? primaryId : categoryIds[0];

  const { data: existing, error: existingError } = await supabase
    .from("product_categories")
    .select("category_id")
    .eq("product_id", productId);
  if (existingError) {
    throw new Error("Unable to read the product's categories.", {
      cause: existingError,
    });
  }

  const removed = (existing ?? [])
    .map((row) => row.category_id as string)
    .filter((id) => !categoryIds.includes(id));
  if (removed.length > 0) {
    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("product_id", productId)
      .in("category_id", removed);
    if (error) {
      throw new Error("Unable to remove product categories.", { cause: error });
    }
  }

  if (categoryIds.length === 0) {
    return;
  }

  // Clear the old primary first so the one-primary-per-product index holds.
  const { error: clearError } = await supabase
    .from("product_categories")
    .update({ is_primary: false })
    .eq("product_id", productId);
  if (clearError) {
    throw new Error("Unable to update the primary category.", {
      cause: clearError,
    });
  }

  const { error: upsertError } = await supabase.from("product_categories").upsert(
    categoryIds.map((categoryId) => ({
      product_id: productId,
      category_id: categoryId,
      is_primary: categoryId === primary,
    })),
    { onConflict: "product_id,category_id" },
  );
  if (upsertError) {
    throw new Error("Unable to save product categories.", {
      cause: upsertError,
    });
  }
}

export async function saveProduct(formData: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const id = getFormValue(formData, "id");
  const title = getFormValue(formData, "title");
  const slug = getFormValue(formData, "slug");
  const description = getFormValue(formData, "description");
  const category = getFormValue(formData, "category");
  const author = getFormValue(formData, "author");
  const publisher = getFormValue(formData, "publisher");
  const productType = getFormValue(formData, "productType");
  const commerceMode = getFormValue(formData, "commerceMode");
  const courseAffiliateFields = getFormValue(formData, "courseAffiliateFields") === "1";
  const courseAffiliatePartner = getFormValue(formData, "courseAffiliatePartner");
  const courseAffiliateUrlValue = getFormValue(formData, "courseAffiliateUrl");
  const imageUrlValue = getFormValue(formData, "imageUrl");
  const imageUrl = imageUrlValue ? parseProductImageUrl(imageUrlValue) : null;
  const costPriceValue = getFormValue(formData, "costPrice");
  const costPrice = costPriceValue === "" ? null : parsePrice(costPriceValue);
  const affiliateCommissionType = getFormValue(formData, "affiliateCommissionType") || "none";
  const affiliateCommissionValueRaw = getFormValue(formData, "affiliateCommissionValue") || "0";
  const affiliateCommissionValue = parsePrice(affiliateCommissionValueRaw);
  const pricingMode = getFormValue(formData, "pricingMode") || "manual";
  const markupValue = getFormValue(formData, "markupPercent") || "0";
  const markupPercent = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(markupValue) ? Number(markupValue) : NaN;
  if (
    !["manual", "automatic"].includes(pricingMode) ||
    !["none", "percentage", "fixed"].includes(affiliateCommissionType) ||
    affiliateCommissionValue === undefined ||
    (affiliateCommissionType !== "none" && affiliateCommissionValue <= 0) ||
    (affiliateCommissionType === "percentage" && affiliateCommissionValue > 100) ||
    (affiliateCommissionType === "none" && affiliateCommissionValue !== 0) ||
    (commerceMode !== "direct" && (affiliateCommissionType !== "none" || affiliateCommissionValue !== 0)) ||
    (costPriceValue !== "" && costPrice === undefined) ||
    !Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 10000 ||
    (pricingMode === "automatic" && (costPrice === null || costPrice === undefined))
  ) redirect("/admin?status=product-invalid");

  const priceValue = getFormValue(formData, "price");
  const listPriceValue = getFormValue(formData, "listPrice");
  const manualPrice =
    commerceMode === "affiliate" && priceValue === ""
      ? courseAffiliateFields && listPriceValue !== ""
        ? parsePrice(listPriceValue)
        : null
      : parsePrice(priceValue);
  const calculatedPrice = costPrice == null ? null : Math.round(costPrice * (1 + markupPercent / 100) * 100) / 100;
  const price = pricingMode === "automatic" ? calculatedPrice : manualPrice;
  const listPrice =
    listPriceValue === "" || (courseAffiliateFields && priceValue === "")
      ? null
      : parsePrice(listPriceValue);
  const edition = getFormValue(formData, "edition");
  const isbn = getFormValue(formData, "isbn");
  const language = getFormValue(formData, "language");
  const country = getFormValue(formData, "country");
  const pageCountValue = getFormValue(formData, "pageCount");
  const pageCount = pageCountValue === "" ? null : Number(pageCountValue);
  const weightValue = getFormValue(formData, "weightKg");
  const weightKg = weightValue === "" ? null : Number(weightValue);
  const isPublishedValue = getFormValue(formData, "isPublished");
  const categoriesSubmitted = getFormValue(formData, "categoriesSubmitted") === "1";
  const categoryIds = [
    ...new Set(
      formData
        .getAll("categoryIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim()),
    ),
  ];
  const primaryCategoryId = getFormValue(formData, "primaryCategoryId");
  const entityRelationsSubmitted = getFormValue(formData, "entityRelationsSubmitted") === "1";
  const entitySelections: ProductEntitySelections = {
    authors: getUuidList(formData, "authorsIds"),
    publishers: getUuidList(formData, "publishersIds"),
    brands: getUuidList(formData, "brandsIds"),
    creators: getUuidList(formData, "creatorsIds"),
  };
  const entityPrimaryIds: Record<ProductEntityKind, string> = {
    authors: getFormValue(formData, "authorsPrimaryId"),
    publishers: getFormValue(formData, "publishersPrimaryId"),
    brands: getFormValue(formData, "brandsPrimaryId"),
    creators: getFormValue(formData, "creatorsPrimaryId"),
  };

  if (
    categoryIds.length > 30 ||
    Object.values(entitySelections).some((ids) => ids.length > 30 || ids.some((entityId) => !isUuid(entityId))) ||
    Object.values(entityPrimaryIds).some((entityId) => entityId !== "" && !isUuid(entityId)) ||
    categoryIds.some((categoryId) => !isUuid(categoryId)) ||
    (primaryCategoryId !== "" && !isUuid(primaryCategoryId)) ||
    edition.length > 80 ||
    isbn.length > 30 ||
    language.length > 60 ||
    country.length > 60 ||
    (pageCount !== null &&
      (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 20000)) ||
    (weightKg !== null &&
      (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 1000)) ||
    (id && !isUuid(id)) ||
    !title ||
    title.length > 200 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 160 ||
    description.length > 5000 ||
    category.length > 120 ||
    author.length > 160 ||
    publisher.length > 160 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productType) ||
    productType.length > 80 ||
    !isCommerceMode(commerceMode) ||
    (imageUrlValue !== "" && !imageUrl) ||
    (commerceMode === "direct" && price === undefined) ||
    (pricingMode === "manual" && commerceMode === "direct" && manualPrice === undefined) ||
    (commerceMode === "affiliate" && priceValue !== "" && price === undefined) ||
    listPrice === undefined ||
    (listPrice !== null && (price == null || listPrice < price)) ||
    !["", "true"].includes(isPublishedValue)
  ) {
    redirect("/admin?status=product-invalid");
  }

  const { data: type, error: typeError } = await supabase
    .from("product_types")
    .select("slug")
    .eq("slug", productType)
    .eq("is_active", true)
    .maybeSingle();

  if (typeError) {
    throw new Error("Unable to verify the product type.", { cause: typeError });
  }
  if (!type) {
    redirect("/admin?status=product-type-invalid");
  }

  let validatedCourseAffiliateUrl: string | null = null;
  if (courseAffiliateFields) {
    if (
      productType !== "course" ||
      commerceMode !== "affiliate" ||
      !isAffiliatePartner(courseAffiliatePartner) ||
      !courseAffiliateUrlValue ||
      courseAffiliateUrlValue.length > 2048
    ) {
      redirect("/admin?status=product-invalid");
    }
    const { data: partnerDomains, error: domainsError } = await supabase
      .from("affiliate_partner_domains")
      .select("hostname")
      .eq("partner", courseAffiliatePartner);
    if (domainsError) throw new Error("Unable to verify the course affiliate provider.", { cause: domainsError });
    const allowedHostnames = new Set(partnerDomains.map(({ hostname }) => hostname));
    if (allowedHostnames.size === 0) redirect("/admin?status=partner-domain-unconfigured");
    validatedCourseAffiliateUrl = parseAffiliateUrl(courseAffiliateUrlValue, allowedHostnames) ?? null;
    if (!validatedCourseAffiliateUrl) redirect("/admin?status=product-invalid");
  }

  const values = {
    title,
    slug,
    description,
    category: category || null,
    image_url: imageUrl,
    commerce_mode: commerceMode,
    affiliate_commission_type: affiliateCommissionType,
    affiliate_commission_value: affiliateCommissionValue,
    author: author || null,
    publisher: publisher || null,
    product_type: productType,
    price,
    cost_price: costPrice,
    pricing_mode: pricingMode,
    markup_percent: markupPercent,
    list_price: listPrice,
    edition: edition || null,
    isbn: isbn || null,
    page_count: pageCount,
    language: language || null,
    country: country || null,
    weight_kg: weightKg,
    is_published: isPublishedValue === "true",
    status: isPublishedValue === "true" ? "published" : "draft",
    updated_at: new Date().toISOString(),
  };

  if (id) {
    if (commerceMode !== "affiliate") {
      const { data: activeLinks, error: activeLinksError } = await supabase
        .from("affiliate_links")
        .select("id")
        .eq("product_id", id)
        .eq("is_active", true)
        .limit(1);

      if (activeLinksError) {
        throw new Error("Unable to verify the product's active affiliate links.", {
          cause: activeLinksError,
        });
      }
      if (activeLinks.length > 0) {
        redirect("/admin?status=deactivate-links-first");
      }
    }

    const { data: oldProduct, error: oldProductError } = await supabase
      .from("products")
      .select("price,cost_price")
      .eq("id", id)
      .maybeSingle();
    if (oldProductError) throw new Error("Unable to read previous product pricing.", { cause: oldProductError });
    const { data, error } = await supabase
      .from("products")
      .update(values)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        redirect("/admin?status=product-exists");
      }
      throw new Error("Unable to update the catalog product.", {
        cause: error,
      });
    }
    if (!data) {
      redirect("/admin?status=product-not-found");
    }

    if (categoriesSubmitted) {
      await syncProductCategories(supabase, id, categoryIds, primaryCategoryId);
    }
    if (entityRelationsSubmitted) {
      await syncProductEntityRelations(supabase, id, entitySelections, entityPrimaryIds);
    }
    if (!oldProduct || Number(oldProduct.price ?? -1) !== Number(price ?? -1) || Number(oldProduct.cost_price ?? -1) !== Number(costPrice ?? -1)) {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: historyError } = await supabase.from("product_price_history").insert({
        product_id: id, old_price: oldProduct?.price ?? null, new_price: price ?? 0,
        old_cost_price: oldProduct?.cost_price ?? null, new_cost_price: costPrice,
        pricing_mode: pricingMode, reason: "Product pricing updated", changed_by: user?.id ?? null,
      });
      if (historyError) throw new Error("Product saved, but price history could not be recorded.", { cause: historyError });
    }
    await logActivity(supabase, "product_updated", "product", id, { slug, title });
    finishAction("product-updated");
  }

  const { data: created, error } = await supabase
    .from("products")
    .insert(values)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      redirect("/admin?status=product-exists");
    }
    throw new Error(
      "Unable to add the catalog product. Confirm that its slug is unique.",
      { cause: error },
    );
  }

  if (courseAffiliateFields && created && validatedCourseAffiliateUrl) {
    const { error: affiliateLinkError } = await supabase.from("affiliate_links").insert({
      product_id: created.id,
      partner: courseAffiliatePartner,
      url: validatedCourseAffiliateUrl,
      is_active: true,
    });
    if (affiliateLinkError) {
      throw new Error("Course saved, but its affiliate link could not be saved. Open Affiliate Links to finish setup.", { cause: affiliateLinkError });
    }
  }

  if (categoriesSubmitted && created) {
    await syncProductCategories(supabase, created.id, categoryIds, primaryCategoryId);
  }
  if (entityRelationsSubmitted && created) {
    await syncProductEntityRelations(supabase, created.id, entitySelections, entityPrimaryIds);
  }
  if (price !== null) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: historyError } = await supabase.from("product_price_history").insert({
      product_id: created.id, old_price: null, new_price: price,
      old_cost_price: null, new_cost_price: costPrice,
      pricing_mode: pricingMode, reason: "Initial product price", changed_by: user?.id ?? null,
    });
    if (historyError) throw new Error("Product created, but initial price history could not be recorded.", { cause: historyError });
  }
  await logActivity(supabase, "product_created", "product", slug, { title });
  finishAction("product-created");
}

export async function setProductArchiveStatus(formData: FormData) {
  const { supabase } = await requirePermission("manage_products");
  const id = getFormValue(formData, "id");
  const archiveValue = getFormValue(formData, "archive");

  if (!isUuid(id) || !["true", "false"].includes(archiveValue)) {
    redirect("/admin?status=product-invalid");
  }

  const archived = archiveValue === "true";
  const { data, error } = await supabase
    .from("products")
    .update(
      archived
        ? { archived_at: new Date().toISOString(), is_published: false }
        : { archived_at: null },
    )
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to change the product archive status.", {
      cause: error,
    });
  }
  if (!data) {
    redirect("/admin?status=product-not-found");
  }

  await logActivity(
    supabase,
    archived ? "product_archived" : "product_restored",
    "product",
    id,
  );
  finishAction(archived ? "product-archived" : "product-restored");
}

export async function addProductType(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const slug = getFormValue(formData, "slug");
  const label = getFormValue(formData, "label");

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 80 ||
    !label ||
    label.length > 120
  ) {
    redirect("/admin?status=product-type-invalid");
  }

  const { error } = await supabase.from("product_types").insert({ slug, label });
  if (error) {
    if (error.code === "23505") {
      redirect("/admin?status=product-type-exists");
    }
    throw new Error("Unable to add the product type.", { cause: error });
  }

  finishAction("product-type-created");
}
