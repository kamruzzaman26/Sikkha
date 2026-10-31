"use client";

import { useState } from "react";

type Option = { label: string; value: string };

export default function MobileCatalogFilters({
  categories,
  category,
  query,
  sort,
}: {
  categories: Option[];
  category: string;
  query: string;
  sort: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm">
          <span aria-hidden="true">☷</span> Filters
          {category && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">1</span>}
        </button>
        <form action="/books" method="get" className="flex-1">
          {query && <input type="hidden" name="q" value={query} />}
          {category && <input type="hidden" name="category" value={category} />}
          <select name="sort" defaultValue={sort} aria-label="Sort books" onChange={(event) => event.currentTarget.form?.requestSubmit()} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
            <option value="name-asc">Sort: Name A–Z</option>
            <option value="name-desc">Sort: Name Z–A</option>
            <option value="newest">Sort: Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </form>
      </div>
      {open && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Catalog filters">
          <button type="button" aria-label="Close filters" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/45" />
          <div className="absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] max-w-[88vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-bold">Filters</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-xl" aria-label="Close filters">×</button>
            </div>
            <form action="/books" method="get" className="flex min-h-0 flex-1 flex-col">
              {query && <input type="hidden" name="q" value={query} />}
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <section>
                  <h3 className="mb-3 text-sm font-bold">Shop By Categories</h3>
                  <label className="flex items-center gap-2 py-2 text-sm"><input type="radio" name="category" value="" defaultChecked={!category} /> All Books</label>
                  {categories.map((item) => <label key={item.value} className="flex items-center gap-2 py-2 text-sm"><input type="radio" name="category" value={item.value} defaultChecked={category === item.value} /> {item.label}</label>)}
                </section>
                <section>
                  <h3 className="mb-3 text-sm font-bold">Sort</h3>
                  <select name="sort" defaultValue={sort} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                    <option value="name-asc">Name: A to Z</option><option value="name-desc">Name: Z to A</option><option value="newest">New Released</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option>
                  </select>
                </section>
              </div>
              <div className="flex gap-3 border-t p-4">
                <a href="/books" className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold">Clear All</a>
                <button type="submit" className="flex-1 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-bold text-white">Apply Filters</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
