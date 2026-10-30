"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseAffiliateUrl } from "@/lib/affiliate-url.mjs";
import { parseProductImageUrl } from "@/lib/product-image-url.mjs";
import {
  requireAdmin,
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
  revalidatePath("/books");
  revalidatePath("/books/[slug]", "page");
  revalidatePath("/courses");
  revalidatePath("/courses/[slug]", "page");
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

export async function saveProduct(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const id = getFormValue(formData, "id");
  const title = getFormValue(formData, "title");
  const slug = getFormValue(formData, "slug");
  const description = getFormValue(formData, "description");
  const category = getFormValue(formData, "category");
  const author = getFormValue(formData, "author");
  const publisher = getFormValue(formData, "publisher");
  const productType = getFormValue(formData, "productType");
  const commerceMode = getFormValue(formData, "commerceMode");
  const imageUrlValue = getFormValue(formData, "imageUrl");
  const imageUrl = imageUrlValue ? parseProductImageUrl(imageUrlValue) : null;
  const priceValue = getFormValue(formData, "price");
  const price =
    commerceMode === "direct" ? parsePrice(priceValue) : null;
  const isPublishedValue = getFormValue(formData, "isPublished");

  if (
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
    (commerceMode === "affiliate" && priceValue !== "") ||
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

  const values = {
    title,
    slug,
    description,
    category: category || null,
    image_url: imageUrl,
    commerce_mode: commerceMode,
    author: author || null,
    publisher: publisher || null,
    product_type: productType,
    price,
    is_published: isPublishedValue === "true",
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

    finishAction("product-updated");
  }

  const { error } = await supabase.from("products").insert(values);

  if (error) {
    if (error.code === "23505") {
      redirect("/admin?status=product-exists");
    }
    throw new Error(
      "Unable to add the catalog product. Confirm that its slug is unique.",
      { cause: error },
    );
  }

  finishAction("product-created");
}

export async function setProductArchiveStatus(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
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
