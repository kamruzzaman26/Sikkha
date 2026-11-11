"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prepareBookImportCsv } from "@/lib/book-import-csv.mjs";
import type { BookImportActionResult, BookImportRowResult } from "@/lib/book-import-types";
import { requireAdmin } from "@/lib/supabase/admin";

type ImportRpcRow = {
  row_number: number;
  status: "ready" | "imported" | "duplicate" | "failed" | "invalid";
  reason: string | null;
};

function isImportRpcRow(value: unknown): value is ImportRpcRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.row_number === "number" && Number.isInteger(row.row_number)
    && ["ready","imported","duplicate","failed","invalid"].includes(String(row.status))
    && (row.reason === null || typeof row.reason === "string");
}

function generatedSlug(name: string): string {
  const identity = name.normalize("NFKC").trim().toLocaleLowerCase("bn");
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 32);
  return `product-${digest}`;
}

function reasonForDatabaseCode(code: string | null): string {
  const messages: Record<string,string> = {
    duplicate_name: "এই নামে একটি পণ্য আগে থেকেই আছে।",
    duplicate_url: "এই Affiliate URL আগে থেকেই ব্যবহৃত হয়েছে।",
    duplicate_slug: "এই URL slug আগে থেকেই ব্যবহৃত হয়েছে।",
    invalid_name: "পণ্যের নাম সঠিক নয়।",
    invalid_description: "Description সর্বোচ্চ ৫০০০ অক্ষর হতে পারবে।",
    invalid_slug: "Slug সঠিক নয়।",
    invalid_slug: "Slug সঠিক নয়।",
    invalid_url: "Affiliate URL সঠিক নয়।",
    invalid_image_url: "Image URL সঠিক নয়।",
    partner_not_approved: "Affiliate URL-এর partner অনুমোদিত নয়।",
    invalid_product_type: "Product Type সক্রিয় তালিকায় পাওয়া যায়নি।",
    invalid_sales_type: "Sales Type সঠিক নয়।",
    direct_price_required: "Direct পণ্যের Selling Price আবশ্যক।",
    invalid_price: "Selling Price সঠিক নয়।",
    invalid_cost_price: "Cost Price সঠিক নয়।",
    invalid_list_price: "List Price Selling Price-এর চেয়ে কম হতে পারবে না।",
    invalid_page_count: "Page Count সঠিক নয়।",
    invalid_weight: "Weight সঠিক নয়।",
    invalid_weight: "Weight সঠিক নয়।",
    category_not_found: "এক বা একাধিক Category Path পাওয়া যায়নি।",
    primary_category_not_selected: "Primary Category নির্বাচিত Category-র মধ্যে নেই।",
    direct_product_must_not_have_affiliate_url: "Direct পণ্যের Affiliate URL ফাঁকা রাখতে হবে।",
    database_constraint: "Database validation এই row গ্রহণ করেনি।",
  };
  return messages[code ?? ""] ?? "এই row সংরক্ষণ করা যায়নি।";
}

async function validateRows(csvText: string, mode: "preview" | "commit"): Promise<BookImportActionResult> {
  const { supabase } = await requireAdmin("admin");
  const { data: partnerDomains, error: domainsError } = await supabase
    .from("affiliate_partner_domains").select("partner, hostname");
  if (domainsError) throw new Error("Unable to load approved affiliate partner domains.", { cause: domainsError });

  const partnerByHostname = new Map((partnerDomains ?? []).map(({partner,hostname}) => [hostname,partner]));
  const prepared = prepareBookImportCsv(csvText, partnerByHostname);
  if (prepared.error) return { error: prepared.error, rows: [] };

  const resultRows: BookImportRowResult[] = prepared.rows.map((row) => ({
    rowNumber: row.rowNumber, bookName: row.productName, affiliateUrl: row.affiliateUrl,
    imageUrl: row.imageUrl, productType: row.productType, salesType: row.salesType,
    authors: row.authors, publishers: row.publishers, brands: row.brands, instructors: row.instructors, categories: row.categories,
    bestseller: row.bestseller, status: row.status, reasons: row.reasons,
  }));
  const candidates = prepared.rows.filter((row) => row.status === "ready");
  if (candidates.length === 0) return { rows: resultRows };

  const { data, error } = await supabase.rpc("admin_import_catalog_products", {
    p_commit: mode === "commit",
    p_rows: candidates.map((row) => ({
      row_number: row.rowNumber,
      product_name: row.productName,
      slug: row.slug || generatedSlug(row.productName),
      product_type: row.productType,
      sales_type: row.salesType,
      description: row.description,
      authors: row.authors,
      publishers: row.publishers,
      brands: row.brands,
      instructors: row.instructors,
      categories: row.categories,
      primary_category: row.primaryCategory,
      affiliate_url: row.affiliateUrl || null,
      image_url: row.imageUrl || null,
      isbn: row.isbn || null,
      edition: row.edition || null,
      page_count: row.pageCount || null,
      language: row.language || null,
      country: row.country || null,
      weight_kg: row.weightKg || null,
      cost_price: row.costPrice || null,
      selling_price: row.sellingPrice || null,
      list_price: row.listPrice || null,
      bestseller: row.bestseller,
    })),
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return { error: "Smart Catalog Import-এর database migration এখনো apply হয়নি। কোনো পণ্য সংরক্ষণ করা হয়নি।", rows: resultRows };
    }
    if (error.code === "42501") return { error: "Admin authorization যাচাই করা যায়নি।", rows: resultRows };
    throw new Error("Unable to validate or import catalog products.", { cause: error });
  }
  if (!Array.isArray(data) || !data.every(isImportRpcRow)) throw new Error("The catalog import RPC returned an invalid response.");

  const rpcByRow = new Map(data.map((row) => [row.row_number,row]));
  for (const result of resultRows) {
    if (result.status !== "ready") continue;
    const rpc = rpcByRow.get(result.rowNumber);
    if (!rpc) throw new Error(`The catalog import RPC omitted CSV row ${result.rowNumber}.`);
    if (rpc.status === "duplicate" || rpc.status === "invalid" || rpc.status === "failed") {
      result.status = rpc.status;
      result.reasons.push(reasonForDatabaseCode(rpc.reason));
    } else if (mode === "commit" && rpc.status === "imported") result.status = "imported";
    else if (mode === "preview" && rpc.status === "ready") result.status = "ready";
    else throw new Error(`Unexpected import status for CSV row ${result.rowNumber}.`);
  }

  if (mode === "commit" && resultRows.some((row) => row.status === "imported")) {
    for (const route of ["/admin","/","/books","/books/[slug]","/courses","/courses/[slug]","/products","/products/[slug]","/wishlist"]) {
      if (route.includes("[slug]")) revalidatePath(route,"page");
      else revalidatePath(route);
    }
  }
  return { rows: resultRows };
}

export async function previewBookImport(csvText: string): Promise<BookImportActionResult> {
  return validateRows(csvText,"preview");
}
export async function confirmBookImport(csvText: string): Promise<BookImportActionResult> {
  return validateRows(csvText,"commit");
}
