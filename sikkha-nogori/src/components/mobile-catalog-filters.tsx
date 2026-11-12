"use client";

import Link from "next/link";
import { useState } from "react";

type Option = { label: string; value: string };

export type CatalogFilterState = {
  query: string;
  category: string;
  sort: string;
  inStock: boolean;
  authors: string[];
  publishers: string[];
  languages: string[];
  brands: string[];
  tags: string[];
  collection: string;
  minPrice: string;
  maxPrice: string;
  minDiscount: string;
};

const sortOptions: { value: string; label: string }[] = [
  { value: "best-seller", label: "Best Seller" },
  { value: "newest", label: "New Released" },
  { value: "price-low", label: "Price - Low to High" },
  { value: "price-high", label: "Price - High to Low" },
  { value: "discount-high", label: "Discount - High to Low" },
  { value: "discount-low", label: "Discount - Low to High" },
];

function href(state: CatalogFilterState, overrides: Partial<CatalogFilterState>): string {
  const next = { ...state, ...overrides };
  const search = new URLSearchParams();
  if (next.query) search.set("q", next.query);
  if (next.category) search.set("category", next.category);
  if (next.sort && next.sort !== "name-asc") search.set("sort", next.sort);
  if (next.inStock) search.set("instock", "1");
  next.authors.forEach((value) => search.append("author", value));
  next.publishers.forEach((value) => search.append("publisher", value));
  next.languages.forEach((value) => search.append("language", value));
  next.brands.forEach((value) => search.append("brand", value));
  next.tags.forEach((value) => search.append("tag", value));
  if (next.collection) search.set("collection", next.collection);
  if (next.minPrice) search.set("minPrice", next.minPrice);
  if (next.maxPrice) search.set("maxPrice", next.maxPrice);
  if (next.minDiscount) search.set("discount", next.minDiscount);
  const suffix = search.toString();
  return suffix ? `/books?${suffix}` : "/books";
}

const pill =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-medium whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="absolute inset-0 bg-slate-950/50" />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] w-full max-w-xl flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="relative flex items-center justify-center px-5 py-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="absolute right-4 flex size-9 items-center justify-center rounded-full bg-slate-200 text-lg text-slate-800">×</button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

function FacetSection({ title, name, options, selected, limit = 8 }: { title: string; name: string; options: Option[]; selected: string[]; limit?: number }) {
  const [all, setAll] = useState(false);
  if (options.length === 0) return null;
  const shown = all ? options : options.slice(0, limit);
  return (
    <section className="border-t-4 border-slate-100 pt-4">
      <h3 className="mb-2 text-base font-bold text-slate-900">{title}</h3>
      {shown.map((option) => (
        <label key={option.value} className="flex items-start gap-3 py-2.5 text-[15px] leading-6 text-slate-800">
          <input type="checkbox" name={name} value={option.value} defaultChecked={selected.includes(option.value)} className="mt-1 size-5 shrink-0 rounded border-slate-300 accent-blue-700" />
          <span>{option.label}</span>
        </label>
      ))}
      {options.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="py-2 text-sm font-semibold text-blue-700">{all ? "Show Less" : "Show More"}</button>
      )}
    </section>
  );
}

export default function MobileCatalogFilters({
  categories,
  state,
  facets,
}: {
  categories: Option[];
  state: CatalogFilterState;
  facets: { authors: string[]; publishers: string[]; languages: string[]; brands: Option[]; tags: Option[]; collections: Option[] };
}) {
  const [sheet, setSheet] = useState<null | "filter" | "sort">(null);
  const [allCategories, setAllCategories] = useState(false);
  const activeCount = (state.category ? 1 : 0) + (state.inStock ? 1 : 0) + state.authors.length + state.publishers.length + state.languages.length +
    state.brands.length + state.tags.length + (state.collection ? 1 : 0) + (state.minPrice ? 1 : 0) + (state.maxPrice ? 1 : 0) + (state.minDiscount ? 1 : 0);
  const sortIsListed = sortOptions.some((option) => option.value === state.sort);
  const shownCategories = allCategories ? categories : categories.slice(0, 10);
  const asOptions = (values: string[]): Option[] => values.map((value) => ({ label: value, value }));

  return (
    <div>
      <div className="-mx-1 flex items-center gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="toolbar" aria-label="Catalog filter and sort">
        <button type="button" onClick={() => setSheet("filter")} className={`${pill} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M7 12h10M10 17h4" /></svg>
          Filter
          {activeCount > 0 && <span className="rounded-full bg-blue-700 px-1.5 text-xs font-bold text-white">{activeCount}</span>}
        </button>
        <button type="button" onClick={() => setSheet("sort")} className={`${pill} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></svg>
          Sort
        </button>
        <Link href={href(state, { sort: "best-seller" })} aria-current={state.sort === "best-seller" ? "true" : undefined} className={`${pill} ${state.sort === "best-seller" ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}>Best Seller</Link>
        <Link href={href(state, { sort: "newest" })} aria-current={state.sort === "newest" ? "true" : undefined} className={`${pill} ${state.sort === "newest" ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}>New Released</Link>
      </div>

      {sheet === "sort" && (
        <Sheet title="Sort by" onClose={() => setSheet(null)}>
          <div className="overflow-y-auto border-t border-slate-200 px-5 pb-6 pt-2">
            {sortOptions.map((option) => (
              <Link key={option.value} href={href(state, { sort: option.value })} onClick={() => setSheet(null)} className="flex items-center gap-4 py-3.5 text-lg text-slate-900">
                <span aria-hidden="true" className={`flex size-6 items-center justify-center rounded-full border-2 ${state.sort === option.value ? "border-blue-700" : "border-slate-300"}`}>
                  {state.sort === option.value && <span className="size-3 rounded-full bg-blue-700" />}
                </span>
                {option.label}
              </Link>
            ))}
            {!sortIsListed && <p className="pt-2 text-xs text-slate-500">Current order: Name (A–Z)</p>}
          </div>
        </Sheet>
      )}

      {sheet === "filter" && (
        <form action="/books" method="get" className="contents">
          {state.query && <input type="hidden" name="q" value={state.query} />}
          {state.sort && state.sort !== "name-asc" && <input type="hidden" name="sort" value={state.sort} />}
          <Sheet
            title="Filters"
            onClose={() => setSheet(null)}
            footer={
              <div className="flex gap-3 border-t border-slate-200 p-4">
                <Link href={href({ ...state, category: "", inStock: false, authors: [], publishers: [], languages: [], brands: [], tags: [], collection: "", minPrice: "", maxPrice: "", minDiscount: "" }, {})} onClick={() => setSheet(null)} className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-slate-300 text-base font-semibold text-slate-800">Clear All</Link>
                <button type="submit" className="min-h-12 flex-[2] rounded-lg bg-blue-700 text-base font-bold text-white hover:bg-blue-800">Apply Filter</button>
              </div>
            }
          >
            <div className="space-y-4 overflow-y-auto border-t border-slate-200 px-5 pb-4 pt-4">
              <section>
                <h3 className="mb-2 text-base font-bold text-slate-900">Shop By Categories</h3>
                <label className="flex items-center gap-3 py-2.5 text-[15px] text-slate-800"><input type="radio" name="category" value="" defaultChecked={!state.category} className="size-5 accent-blue-700" /> All Books</label>
                {shownCategories.map((item) => (
                  <label key={item.value} className="flex items-start gap-3 py-2.5 text-[15px] leading-6 text-slate-800">
                    <input type="radio" name="category" value={item.value} defaultChecked={state.category === item.value} className="mt-1 size-5 shrink-0 accent-blue-700" />
                    <span>{item.label}</span>
                  </label>
                ))}
                {categories.length > 10 && (
                  <button type="button" onClick={() => setAllCategories(!allCategories)} className="py-2 text-sm font-semibold text-blue-700">{allCategories ? "Show Less" : "Show More"}</button>
                )}
              </section>

              <section className="border-t-4 border-slate-100 pt-2">
                <label className="flex items-center gap-3 py-3 text-base font-medium text-slate-900"><input type="checkbox" name="instock" value="1" defaultChecked={state.inStock} className="size-5 rounded accent-blue-700" /> In Stock</label>
                <label className="flex items-center gap-3 border-t border-slate-100 py-3 text-base font-medium text-slate-400"><input type="checkbox" disabled className="size-5 rounded" /> eBook <span className="text-xs font-normal">(coming soon)</span></label>
              </section>

              <section className="border-t-4 border-slate-100 pt-4">
                <h3 className="mb-2 text-base font-bold text-slate-900">Price Range (৳)</h3>
                <div className="flex items-center gap-2">
                  <input name="minPrice" type="number" inputMode="numeric" min={0} placeholder="Min" aria-label="Minimum price" defaultValue={state.minPrice} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                  <span aria-hidden="true">–</span>
                  <input name="maxPrice" type="number" inputMode="numeric" min={0} placeholder="Max" aria-label="Maximum price" defaultValue={state.maxPrice} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </div>
              </section>

              <section className="border-t-4 border-slate-100 pt-4">
                <h3 className="mb-2 text-base font-bold text-slate-900">Discount</h3>
                {[["", "Any"], ["10", "10% or more"], ["20", "20% or more"], ["30", "30% or more"], ["50", "50% or more"]].map(([value, text]) => (
                  <label key={value} className="flex items-center gap-3 py-2 text-[15px] text-slate-800">
                    <input type="radio" name="discount" value={value} defaultChecked={state.minDiscount === value} className="size-5 accent-blue-700" /> {text}
                  </label>
                ))}
              </section>

              {facets.collections.length > 0 && (
                <section className="border-t-4 border-slate-100 pt-4">
                  <h3 className="mb-2 text-base font-bold text-slate-900">Collection</h3>
                  <label className="flex items-center gap-3 py-2 text-[15px] text-slate-800"><input type="radio" name="collection" value="" defaultChecked={!state.collection} className="size-5 accent-blue-700" /> Any</label>
                  {facets.collections.map((option) => (
                    <label key={option.value} className="flex items-center gap-3 py-2 text-[15px] text-slate-800">
                      <input type="radio" name="collection" value={option.value} defaultChecked={state.collection === option.value} className="size-5 accent-blue-700" /> {option.label}
                    </label>
                  ))}
                </section>
              )}
              <FacetSection title="Brands" name="brand" options={facets.brands} selected={state.brands} />
              <FacetSection title="Tags" name="tag" options={facets.tags} selected={state.tags} />
              <FacetSection title="Authors" name="author" options={asOptions(facets.authors)} selected={state.authors} />
              <FacetSection title="Publishers" name="publisher" options={asOptions(facets.publishers)} selected={state.publishers} />
              <FacetSection title="Languages" name="language" options={asOptions(facets.languages)} selected={state.languages} />
            </div>
          </Sheet>
        </form>
      )}
    </div>
  );
}
