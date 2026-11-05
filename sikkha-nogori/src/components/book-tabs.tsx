"use client";

import { useState } from "react";

export type BookSpecRow = { label: string; value: string };

export default function BookTabs({
  summary,
  specs,
}: {
  summary: string;
  specs: BookSpecRow[];
}) {
  const hasSummary = summary.trim() !== "";
  const hasSpecs = specs.length > 0;\n  const hasAuthor = Boolean(author?.trim());
  const [active, setActive] = useState<"summary" | "specs">(
    hasSummary ? "summary" : "specs",
  );

  if (!hasSummary && !hasSpecs) {
    return null;
  }

  const tabs = [
    hasSummary ? ({ id: "summary", label: "সারসংক্ষেপ" } as const) : null,
    hasSpecs ? ({ id: "specs", label: "স্পেসিফিকেশন" } as const) : null,\n    hasAuthor ? ({ id: "author", label: "লেখক" } as const) : null,
  ].filter((tab) => tab !== null);

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="বইয়ের তথ্য"
        className="flex gap-6 border-b border-slate-200"
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
            className={`-mb-px min-h-11 border-b-2 pb-2 text-lg font-semibold transition ${
              active === tab.id
                ? "border-emerald-700 text-slate-900"
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
          <p className="whitespace-pre-line leading-7 text-slate-700">
            {summary}
          </p>
        </div>
      )}

      {active === "author" && hasAuthor && (\n        <div role="tabpanel" id="book-panel-author" aria-labelledby="book-tab-author" className="pt-5">\n          <h3 className="text-base font-bold text-slate-900">{author}</h3>\n          <p className="mt-2 text-sm leading-6 text-slate-600">এই বইয়ের লেখক হিসেবে তালিকাভুক্ত। লেখকের বিস্তারিত পরিচিতি যুক্ত হলে এখানে দেখানো হবে।</p>\n        </div>\n      )}\n\n      {active === "specs" && hasSpecs && (
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
                className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-3 text-base sm:grid-cols-[10rem_minmax(0,1fr)]"
              >
                <dt className="text-slate-600">{row.label}:</dt>
                <dd className="font-medium text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
