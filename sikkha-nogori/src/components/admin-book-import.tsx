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
      <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th scope="col" className="px-3 py-3">CSV row</th>
            <th scope="col" className="px-3 py-3">Book title</th>
            <th scope="col" className="px-3 py-3">Affiliate URL</th>
            <th scope="col" className="px-3 py-3">Image URL</th>
            <th scope="col" className="px-3 py-3">Status & details</th>
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
              <td className="max-w-72 break-all px-3 py-3">
                {row.affiliateUrl || "—"}
              </td>
              <td className="max-w-72 break-all px-3 py-3">
                {row.imageUrl || "—"}
              </td>
              <td className="max-w-80 px-3 py-3">
                <p className="font-bold">{statusLabel(row.status)}</p>
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
      setError("Please select a CSV file first.");
      return;
    }
    if (file.size === 0 || file.size > MAX_BOOK_IMPORT_BYTES) {
      setError("The CSV file must not be empty or exceed 512 KiB.");
      return;
    }

    setBusy(true);
    setError("");
    setReport(null);
    try {
      const contents = await file.text();
      const result = await previewBookImport(contents);
      setCsvText(contents);
      setFileName(file.name);
      setRows(result.rows);
      if (result.error) {
        setError(result.error);
      }
    } catch {
      setError("Could not prepare the CSV preview. Check the file and try again.");
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
      className="mt-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7"
    >
      <h2 id="book-import-heading" className="text-xl font-bold">
        Bulk Import Products (CSV)
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Required CSV headers:{" "}
        <code className="rounded bg-slate-100 px-1">book_name</code>,{" "}
        <code className="rounded bg-slate-100 px-1">affiliate_url</code>, and{" "}
        <code className="rounded bg-slate-100 px-1">image_url</code>. Maximum 500 rows / 512 KiB.
        Preview validates every row before import. Only valid new products are saved as unpublished drafts.
        Product names and URLs are preserved exactly. Fix invalid rows, select the updated CSV, and run Preview again.
      </p>     <p className="mt-2 text-sm leading-6 text-amber-900">
        Imported affiliate products will not be available for direct checkout.
        No products will be written if the required database migration is missing.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label
            htmlFor="book-import-csv"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            CSV file
          </label>
          <input
            ref={fileInputRef}
            id="book-import-csv"
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={handleFileChange}
            className="block min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:font-semibold file:text-emerald-800"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={handlePreview}
          className="min-h-11 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
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
          className="mt-5 min-h-11 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
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
