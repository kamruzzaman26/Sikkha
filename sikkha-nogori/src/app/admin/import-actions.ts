"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prepareBookImportCsv } from "@/lib/book-import-csv.mjs";
import type {
  BookImportActionResult,
  BookImportRowResult,
} from "@/lib/book-import-types";
import { requireAdmin } from "@/lib/supabase/admin";

type ImportRpcRow = {
  row_number: number;
  status: "ready" | "imported" | "duplicate" | "failed" | "invalid";
  reason: string | null;
};

function isImportRpcRow(value: unknown): value is ImportRpcRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const row = value as Record<string, unknown>;
  return (
    typeof row.row_number === "number" &&
    Number.isInteger(row.row_number) &&
    ["ready", "imported", "duplicate", "failed", "invalid"].includes(
      String(row.status),
    ) &&
    (row.reason === null || typeof row.reason === "string")
  );
}

function generatedSlug(bookName: string): string {
  const identity = bookName.normalize("NFKC").trim().toLocaleLowerCase("bn");
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 32);
  return `book-${digest}`;
}

function reasonForDatabaseCode(code: string | null): string {
  switch (code) {
    case "duplicate_name":
      return "A product with this name already exists in the database.";
    case "duplicate_url":
      return "This affiliate URL already exists in the database.";
    case "duplicate_slug":
      return "A generated catalog identifier for this name already exists.";
    case "invalid_name":
      return "The book title did not pass database validation.";
    case "invalid_url":
      return "The affiliate URL did not pass database validation.";
    case "invalid_image_url":
      return "The image URL did not pass database validation.";
    case "partner_not_approved":
      return "The affiliate URL hostname is not approved for this partner.";
    case "database_constraint":
      return "The database product validation rejected this row.";
    default:
      return "The database could not save this row.";
  }
}

async function validateRows(
  csvText: string,
  mode: "preview" | "commit",
): Promise<BookImportActionResult> {
  const { supabase } = await requireAdmin("admin");
  const { data: partnerDomains, error: domainsError } = await supabase
    .from("affiliate_partner_domains")
    .select("partner, hostname");

  if (domainsError) {
    throw new Error("Unable to load approved affiliate partner domains.", {
      cause: domainsError,
    });
  }

  if (partnerDomains.length === 0) {
    return {
      error: "No affiliate partner hostname is approved. Configure one before importing.",
      rows: [],
    };
  }

  const partnerByHostname = new Map(
    partnerDomains.map(({ partner, hostname }) => [hostname, partner]),
  );
  const prepared = prepareBookImportCsv(csvText, partnerByHostname);
  if (prepared.error) {
    return { error: prepared.error, rows: [] };
  }

  const resultRows: BookImportRowResult[] = prepared.rows.map((row) => ({
    rowNumber: row.rowNumber,
    bookName: row.bookName,
    affiliateUrl: row.affiliateUrl,
    imageUrl: row.imageUrl,
    status: row.status,
    reasons: row.reasons,
  }));
  const candidates = prepared.rows.filter((row) => row.status === "ready");
  if (candidates.length === 0) {
    return { rows: resultRows };
  }

  const { data, error } = await supabase.rpc("admin_import_affiliate_books", {
    p_commit: mode === "commit",
    p_rows: candidates.map((row) => ({
      row_number: row.rowNumber,
      book_name: row.bookName,
      slug: generatedSlug(row.bookName),
      affiliate_url: row.affiliateUrl,
      image_url: row.imageUrl,
    })),
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return {
        error:
          "The database migration for CSV import has not been applied. No products were written.",
        rows: resultRows,
      };
    }
    if (error.code === "42501") {
      return {
        error: "Server-side administrator authorization could not be verified for this import.",
        rows: resultRows,
      };
    }
    throw new Error("Unable to validate or import products.", { cause: error });
  }

  if (!Array.isArray(data) || !data.every(isImportRpcRow)) {
    throw new Error("The product import RPC returned an invalid response.");
  }

  const rpcRows = data;
  const rpcByRowNumber = new Map(
    rpcRows.map((row) => [row.row_number, row]),
  );

  for (const result of resultRows) {
    if (result.status !== "ready") {
      continue;
    }

    const rpcResult = rpcByRowNumber.get(result.rowNumber);
    if (!rpcResult) {
      throw new Error(
        `The product import RPC omitted CSV row ${result.rowNumber}.`,
      );
    }

    if (rpcResult.status === "duplicate") {
      result.status = "duplicate";
      result.reasons.push(reasonForDatabaseCode(rpcResult.reason));
    } else if (rpcResult.status === "invalid") {
      result.status = "invalid";
      result.reasons.push(reasonForDatabaseCode(rpcResult.reason));
    } else if (rpcResult.status === "failed") {
      result.status = "failed";
      result.reasons.push(reasonForDatabaseCode(rpcResult.reason));
    } else if (mode === "commit" && rpcResult.status === "imported") {
      result.status = "imported";
    } else if (mode === "preview" && rpcResult.status === "ready") {
      result.status = "ready";
    } else {
      throw new Error(
        `The product import RPC returned an unexpected status for row ${result.rowNumber}.`,
      );
    }
  }

  if (mode === "commit" && resultRows.some((row) => row.status === "imported")) {
    revalidatePath("/admin");
    revalidatePath("/books");
    revalidatePath("/books/[slug]", "page");
    revalidatePath("/products");
    revalidatePath("/products/[slug]", "page");
    revalidatePath("/wishlist");
  }

  return { rows: resultRows };
}

export async function previewBookImport(
  csvText: string,
): Promise<BookImportActionResult> {
  return validateRows(csvText, "preview");
}

export async function confirmBookImport(
  csvText: string,
): Promise<BookImportActionResult> {
  return validateRows(csvText, "commit");
}
