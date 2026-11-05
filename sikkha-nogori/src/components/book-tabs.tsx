"use client";

import { useState } from "react";

export type BookSpecRow = { label: string; value: string };

type ActiveTab = "summary" | "specs" | "author";

export default function BookTabs({
  summary,
  specs,
  author,
}: {
  summary: string;
  specs: BookSpecRow[];
  author?: string;
}) {
  const hasSummary = summary.trim() !== "";
  const hasSpecs = specs.length > 0;
  const hasAuthor = Boolean(author?.trim());
  const initialTab: ActiveTab = hasSummary ? "summary" : hasSpecs ? "specs" : "author";
  const [active, setActive] = useState<ActiveTab>(initialTab);

  if (!hasSummary && !hasSpecs && !hasAuthor) return null;

  const tabs = [
    hasSummary ? ({ id: "summary", label: "সারসংক্ষেপ" } as const) : null,
    hasSpecs ? ({ id: "specs", label: "স্পেসিফিকেশন" } as const) : null,
    hasAuthor ? ({ id: "author", label: "লেখক" } as const) : null,
  ].filter((tab) => tab !== null);

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div
        role="tablist"
        aria-label="বইয়ের তথ্য"
        className="flex flex-wrap gap-x-6 border-b border-slate-200"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`book-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`book-panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`-mb-px min-h-11 border-b-2 px-1 pb-2 text-sm font-bold transition sm:text-base ${
              active === tab.id
                ? "border-blue-700 text-slate-950"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "summary" && hasSummary && (
        <div
          role="tabpanel"
          id="book-panel-summary"
          aria-labelledby="book-tab-summary"
          className="pt-5"
        >
          <p className="whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">
            {summary}
          </p>
        </div>
      )}

      {active === "specs" && hasSpecs && (
        <div
          role="tabpanel"
          id="book-panel-specs"
          aria-labelledby="book-tab-specs"
          className="pt-2"
        >
          <dl className="divide-y divide-slate-100">
            {specs.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:text-base"
              >
                <dt className="text-slate-500">{row.label}:</dt>
                <dd className="font-semibold text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {active === "author" && hasAuthor && (
        <div
          role="tabpanel"
          id="book-panel-author"
          aria-labelledby="book-tab-author"
          className="pt-5"
        >
          <h3 className="text-base font-bold text-slate-900">{author}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            এই বইয়ের লেখক হিসেবে তালিকাভুক্ত। লেখকের বিস্তারিত পরিচিতি যুক্ত হলে এখানে দেখানো হবে।
          </p>
        </div>
      )}
    </section>
  );
}
