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
      return "এই নামের একটি পণ্য database-এ আগে থেকেই আছে।";
    case "duplicate_url":
      return "এই affiliate URL database-এ আগে থেকেই আছে।";
    case "duplicate_slug":
      return "এই নামের generated catalog identifier আগে থেকেই আছে।";
    case "invalid_name":
      return "বইয়ের নাম database validation-এ উত্তীর্ণ হয়নি।";
    case "invalid_url":
      return "Affiliate URL database validation-এ উত্তীর্ণ হয়নি।";
    case "invalid_image_url":
      return "Image URL database validation-এ উত্তীর্ণ হয়নি।";
    case "partner_not_approved":
      return "Affiliate URL-এর partner hostname অনুমোদিত নয়।";
    case "database_constraint":
      return "Database-এর product validation এই row-টি প্রত্যাখ্যান করেছে।";
    default:
      return "Database এই row-টি সংরক্ষণ করতে পারেনি।";
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
      error: "কোনো affiliate partner hostname অনুমোদিত নেই; আগে সেটি configure করুন।",
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
          "CSV import-এর database migration এখনো প্রয়োগ করা হয়নি। কোনো পণ্য লেখা হয়নি।",
        rows: resultRows,
      };
    }
    if (error.code === "42501") {
      return {
        error: "এই আমদানির জন্য server-side Admin অনুমতি যাচাই হয়নি।",
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
