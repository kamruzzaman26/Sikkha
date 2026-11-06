"use client";

import { useState } from "react";

type Option = { label: string; value: string };
type Filters = {
  categories: string[];
  authors: string[];
  publishers: string[];
  languages: string[];
};

const sortOptions = [
  ["name-asc", "নাম: ক থেকে হ"],
  ["name-desc", "নাম: হ থেকে ক"],
  ["newest", "New Released"],
  ["price-low", "দাম: কম থেকে বেশি"],
  ["price-high", "দাম: বেশি থেকে কম"],
] as const;

export default function BooksShopControls({
  categories,
  authors,
  publishers,
  languages,
  filters,
  sort,
  query,
}: {
  categories: Option[];
  authors: string[];
  publishers: string[];
  languages: string[];
  filters: Filters;
  sort: string;
  query: string;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const activeCount = Object.values(filters).reduce((sum, values) => sum + values.length, 0);

  const toggleExpanded = (key: string) =>
    setExpanded((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);

  const group = (title: string, key: keyof Filters, options: Option[], limit: number) => {
    const isExpanded = expanded.includes(key);
    const visible = isExpanded ? options : options.slice(0, limit);
    return (
      <section className="border-b border-slate-100 py-4" key={key}>
        <h3 className="mb-2 text-sm font-bold text-slate-900">{title}</h3>
        <div className="grid gap-1 sm:grid-cols-2">
          {visible.map((option) => (
            <label key={option.value} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-emerald-50">
              <input
                type="checkbox"
                name={key}
                value={option.value}
                defaultChecked={filters[key].includes(option.value)}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {options.length > limit && (
          <button type="button" onClick={() => toggleExpanded(key)} className="mt-2 text-sm font-semibold text-emerald-700 hover:underline">
            {isExpanded ? "কম দেখুন" : "আরও দেখুন"}
          </button>
        )}
      </section>
    );
  };

  const filterOptions = {
    categories,
    authors: authors.map((value) => ({ label: value, value })),
    publishers: publishers.map((value) => ({ label: value, value })),
    languages: languages.map((value) => ({ label: value, value })),
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFilterOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:border-emerald-300 hover:bg-emerald-50">
          <span aria-hidden="true">☷</span> Filter
          {activeCount > 0 && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">{activeCount}</span>}
        </button>
        <button type="button" onClick={() => setSortOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:border-emerald-300 hover:bg-emerald-50">
          ↕ Sort
        </button>
        <form action="/books" method="get">
          {query && <input type="hidden" name="q" value={query} />}
          {Object.entries(filters).flatMap(([key, values]) => values.map((value) => <input key={key + value} type="hidden" name={key} value={value} />))}
          <input type="hidden" name="sort" value="newest" />
          <button type="submit" className={sort === "newest" ? "min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white" : "min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-emerald-50"}>
            New Released
          </button>
        </form>
      </div>

      {filterOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/45" role="dialog" aria-modal="true" aria-label="বই ফিল্টার">
          <button type="button" aria-label="বন্ধ করুন" onClick={() => setFilterOpen(false)} className="absolute inset-0 h-full w-full cursor-default" />
          <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Filters</h2>
                <p className="mt-0.5 text-xs text-slate-500">আপনার পছন্দ অনুযায়ী বই বেছে নিন</p>
              </div>
              <button type="button" onClick={() => setFilterOpen(false)} className="h-9 w-9 rounded-full bg-slate-100 text-xl text-slate-700" aria-label="বন্ধ করুন">×</button>
            </div>
            <form action="/books" method="get" className="flex min-h-0 flex-1 flex-col">
              {query && <input type="hidden" name="q" value={query} />}
              <div className="min-h-0 flex-1 overflow-y-auto px-5">
                {group("Shop By Categories", "categories", filterOptions.categories, 8)}
                {group("Authors", "authors", filterOptions.authors, 5)}
                {group("Publishers", "publishers", filterOptions.publishers, 5)}
                {group("Languages", "languages", filterOptions.languages, 5)}
              </div>
              <div className="flex gap-3 border-t border-slate-100 p-4">
                <a href="/books" className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50">Reset</a>
                <button type="submit" className="flex-1 rounded-full bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">Apply Filter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sortOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/45" role="dialog" aria-modal="true" aria-label="বই সাজান">
          <button type="button" aria-label="বন্ধ করুন" onClick={() => setSortOpen(false)} className="absolute inset-0 h-full w-full cursor-default" />
          <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[75dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-extrabold text-slate-900">Sort by</h2>
              <button type="button" onClick={() => setSortOpen(false)} className="h-9 w-9 rounded-full bg-slate-100 text-xl text-slate-700" aria-label="বন্ধ করুন">×</button>
            </div>
            <form action="/books" method="get" className="p-5">
              {query && <input type="hidden" name="q" value={query} />}
              {Object.entries(filters).flatMap(([key, values]) => values.map((value) => <input key={key + value} type="hidden" name={key} value={value} />))}
              <div className="space-y-1">
                {sortOptions.map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 hover:bg-emerald-50">
                    <input type="radio" name="sort" value={value} defaultChecked={sort === value} className="h-4 w-4 accent-emerald-700" />
                    {label}
                  </label>
                ))}
              </div>
              <button type="submit" className="mt-4 w-full rounded-full bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">Apply Sort</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
