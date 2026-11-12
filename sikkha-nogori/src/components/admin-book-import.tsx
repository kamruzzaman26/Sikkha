"use client";

import { useRef, useState } from "react";
import {
  confirmBookImport,
  previewBookImport,
} from "@/app/admin/import-actions";
import {
  MAX_BOOK_IMPORT_BYTES,
} from "@/lib/book-import-limits.mjs";
import type {
  BookImportActionResult,
  BookImportRowResult,
} from "@/lib/book-import-types";
import { xlsxToCsv } from "@/lib/xlsx-to-csv.mjs";

function statusLabel(status: BookImportRowResult["status"]): string {
  switch (status) {
    case "ready":
      return "Ready to import";
    case "invalid":
      return "Needs correction";
    case "duplicate":
      return "Duplicate";
    case "imported":
      return "Saved as draft";
    case "failed":
      return "Failed";
  }
}

function ImportRows({ rows }: { rows: BookImportRowResult[] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[78rem] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th scope="col" className="px-3 py-3">CSV row</th>
            <th scope="col" className="px-3 py-3">Product</th>
            <th scope="col" className="px-3 py-3">Type / Sales</th>
            <th scope="col" className="px-3 py-3">Authors / Publisher</th>
            <th scope="col" className="px-3 py-3">Categories</th>
            <th scope="col" className="px-3 py-3">Affiliate / Image</th>
            <th scope="col" className="px-3 py-3">Bestseller / Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.rowNumber} className="align-top">
              <td className="whitespace-nowrap px-3 py-3 font-semibold">
                {row.rowNumber}
              </td>
              <td className="max-w-64 whitespace-pre-wrap break-words px-3 py-3">
                {row.bookName || "—"}
              </td>
              <td className="px-3 py-3">
                <p>{row.productType || "—"}</p>
                <p className="text-xs text-slate-500">{row.salesType || "—"}</p>
              </td>
              <td className="max-w-56 px-3 py-3 text-xs">
                <p>{row.authors?.join(" · ") || "—"}</p>
                <p className="mt-1 text-slate-500">{row.publishers?.join(" · ") || "—"}</p>
                <p className="mt-1 text-slate-500">{row.brands?.join(" · ") || row.instructors?.join(" · ") || "—"}</p>
              </td>
              <td className="max-w-64 px-3 py-3 text-xs">
                {row.categories?.join(" | ") || "—"}
              </td>
              <td className="max-w-64 break-all px-3 py-3 text-xs">
                <p>{row.affiliateUrl || "—"}</p>
                <p className="mt-1 text-slate-500">{row.imageUrl || "—"}</p>
              </td>
              <td className="max-w-80 px-3 py-3">
                <p className="font-bold">{row.bestseller ? "Bestseller list" : "—"}</p>
                <p className="mt-1 font-semibold">{statusLabel(row.status)}</p>
                {row.reasons.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-rose-700">
                    {row.reasons.map((reason, index) => (
                      <li key={`${row.rowNumber}-${index}`}>{reason}</li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Summary({ rows }: { rows: BookImportRowResult[] }) {
  const counts = {
    imported: rows.filter((row) => row.status === "imported").length,
    failed: rows.filter((row) => row.status === "failed").length,
    duplicate: rows.filter((row) => row.status === "duplicate").length,
    invalid: rows.filter((row) => row.status === "invalid").length,
    ready: rows.filter((row) => row.status === "ready").length,
  };

  return (
    <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
      {counts.imported > 0 && `Imported: ${counts.imported} · `}
      {`Failed: ${counts.failed} · Duplicates: ${counts.duplicate} · `}
      {counts.invalid > 0 && `Needs correction: ${counts.invalid} · `}
      {counts.ready > 0 && `Ready: ${counts.ready}`}
    </p>
  );
}

export function AdminBookImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BookImportRowResult[]>([]);
  const [report, setReport] = useState<BookImportActionResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handlePreview() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("একটি CSV অথবা XLSX ফাইল নির্বাচন করুন।");
      return;
    }
    if (file.size === 0 || file.size > MAX_BOOK_IMPORT_BYTES) {
      setError("ফাইলটি খালি হতে পারবে না এবং সর্বোচ্চ 512 KiB হতে পারবে।");
      return;
    }

    setBusy(true);
    setError("");
    setReport(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let contents: string;
      if (extension === "csv") {
        contents = await file.text();
      } else if (extension === "xlsx") {
        contents = await xlsxToCsv(await file.arrayBuffer());
      } else {
        throw new Error("শুধু .csv অথবা .xlsx ফাইল আপলোড করা যাবে।");
      }
      const result = await previewBookImport(contents);
      setCsvText(contents);
      setFileName(file.name);
      setRows(result.rows);
      if (result.error) {
        setError(result.error);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ফাইলটি পড়া যায়নি। CSV/XLSX ফাইল যাচাই করে আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!csvText || !rows.some((row) => row.status === "ready")) {
      setError("There are no validated new rows ready to import.");
      return;
    }

    const readyCount = rows.filter((row) => row.status === "ready").length;
    if (
      !window.confirm(
        `Save ${readyCount} validated new products to the database as unpublished drafts?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await confirmBookImport(csvText);
      setRows(result.rows);
      setReport(result);
      if (result.error) {
        setError(result.error);
      }
    } catch {
      setError("Import could not be completed. If any row status is uncertain, run the preview again.");
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange() {
    setCsvText("");
    setFileName("");
    setRows([]);
    setReport(null);
    setError("");
  }

  return (
    <section
      aria-labelledby="book-import-heading"
      className="mt-8 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm sm:p-7"
    >
      <h2 id="book-import-heading" className="text-xl font-bold">
        Bulk Import Products (CSV / XLSX)
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Smart Catalog CSV supports books, courses and other product types. Required headers: <code className="rounded bg-slate-100 px-1">product_name</code>, <code className="rounded bg-slate-100 px-1">image_url</code>, and <code className="rounded bg-slate-100 px-1">sales_type</code>. Legacy <code className="rounded bg-slate-100 px-1">book_name</code> files are also supported. Maximum 500 rows / 512 KiB. Preview validates product type, sales mode, prices, approved affiliate URLs and existing category paths. New authors, publishers, brands and instructors are deduplicated and linked automatically. Every imported product stays an unpublished draft.
      </p>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Affiliate products open the external partner link and cannot be checked out directly. A CSV Bestseller flag adds the product to a draft admin-curated Bestsellers list; it does not claim verified sales ranking. Categories must already exist in Catalog Entities.
      </p>
      <a href="/templates/smart-catalog-import-template.csv" download className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">
        Download Smart Catalog CSV Template (Excel-এ খুলে XLSX হিসেবেও Save করা যাবে)
      </a>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label
            htmlFor="book-import-csv"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            CSV অথবা XLSX file
          </label>
          <input
            ref={fileInputRef}
            id="book-import-csv"
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={handleFileChange}
            className="block min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:font-semibold file:text-brand-800"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={handlePreview}
          className="min-h-11 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Validating…" : "Preview & Validate"}
        </button>
      </div>

      {fileName && (
        <p className="mt-3 text-sm text-slate-600">Selected: {fileName}</p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}
      {report?.rows.length ? <Summary rows={report.rows} /> : null}
      {rows.length > 0 && <ImportRows rows={rows} />}
      {rows.some((row) => row.status === "ready") && !report && !error && (
        <button
          type="button"
          disabled={busy}
          onClick={handleConfirm}
          className="mt-5 min-h-11 rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Importing…" : "Confirm Import of Valid Rows"}
        </button>
      )}
      {report && (
        <p role="status" className="mt-4 text-sm leading-6 text-slate-600">
          Review the import report. Fix failed or invalid rows, select the CSV again
          and run a new preview.
        </p>
      )}
    </section>
  );
}
