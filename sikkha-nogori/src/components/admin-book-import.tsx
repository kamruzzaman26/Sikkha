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
      return "আমদানির জন্য প্রস্তুত";
    case "invalid":
      return "সংশোধন প্রয়োজন";
    case "duplicate":
      return "ডুপ্লিকেট";
    case "imported":
      return "সংরক্ষিত (খসড়া)";
    case "failed":
      return "ব্যর্থ";
  }
}

function ImportRows({ rows }: { rows: BookImportRowResult[] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th scope="col" className="px-3 py-3">CSV row</th>
            <th scope="col" className="px-3 py-3">বইয়ের নাম</th>
            <th scope="col" className="px-3 py-3">Affiliate URL</th>
            <th scope="col" className="px-3 py-3">Image URL</th>
            <th scope="col" className="px-3 py-3">অবস্থা ও কারণ</th>
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
      {counts.imported > 0 && `সফল: ${counts.imported}টি · `}
      {`ব্যর্থ: ${counts.failed}টি · ডুপ্লিকেট: ${counts.duplicate}টি · `}
      {counts.invalid > 0 && `সংশোধন প্রয়োজন: ${counts.invalid}টি · `}
      {counts.ready > 0 && `এখনো প্রস্তুত: ${counts.ready}টি`}
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
      setError("প্রথমে CSV ফাইল নির্বাচন করুন।");
      return;
    }
    if (file.size === 0 || file.size > MAX_BOOK_IMPORT_BYTES) {
      setError("CSV ফাইল খালি হতে পারবে না এবং সর্বোচ্চ 512 KiB হতে পারবে।");
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
      setError("CSV preview প্রস্তুত করা যায়নি। ফাইলটি পরীক্ষা করে আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!csvText || !rows.some((row) => row.status === "ready")) {
      setError("আমদানির জন্য কোনো যাচাইকৃত নতুন row নেই।");
      return;
    }

    const readyCount = rows.filter((row) => row.status === "ready").length;
    if (
      !window.confirm(
        `${readyCount}টি যাচাইকৃত, নতুন পণ্য database-এ অপ্রকাশিত খসড়া হিসেবে সংরক্ষণ করবেন?`,
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
      setError("Import শেষ করা যায়নি। কোনো row-এর অবস্থা অনিশ্চিত হলে আবার preview চালান।");
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
        বইয়ের CSV Bulk Import
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Header অবশ্যই{" "}
        <code className="rounded bg-slate-100 px-1">book_name</code>,{" "}
        <code className="rounded bg-slate-100 px-1">affiliate_url</code>,{" "}
        <code className="rounded bg-slate-100 px-1">image_url</code> হবে।
        সর্বোচ্চ 500 row/512 KiB। Preview-তে যাচাইয়ের পর Confirm করলে শুধু
        valid ও নতুন পণ্য অপ্রকাশিত খসড়া হিসেবে যোগ হবে; CSV-র নাম ও URL হুবহু
        রাখা হবে। ভুল সারি ঠিক করে CSV পুনরায় নির্বাচন করে Preview চালান।
      </p>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Import হওয়া affiliate বই অর্ডার/checkout-এ বিক্রির জন্য যাবে না।
        Migration না থাকলে কোনো পণ্য লেখা হবে না।
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label
            htmlFor="book-import-csv"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            CSV ফাইল
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
          {busy ? "যাচাই হচ্ছে…" : "Preview ও যাচাই"}
        </button>
      </div>

      {fileName && (
        <p className="mt-3 text-sm text-slate-600">নির্বাচিত: {fileName}</p>
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
          {busy ? "সংরক্ষণ হচ্ছে…" : "যাচাইকৃত row import নিশ্চিত করুন"}
        </button>
      )}
      {report && (
        <p role="status" className="mt-4 text-sm leading-6 text-slate-600">
          Import রিপোর্ট দেখুন। ব্যর্থ বা সংশোধনযোগ্য row ঠিক করে CSV আবার
          নির্বাচন করুন এবং নতুন Preview চালান।
        </p>
      )}
    </section>
  );
}
