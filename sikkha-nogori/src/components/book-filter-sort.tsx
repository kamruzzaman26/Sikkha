"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Option = { label: string; value: string };
type Props = {
  categories: Option[];
  authors: string[];
  publishers: string[];
  languages: string[];
  selectedCategory: string;
  selectedAuthors: string[];
  selectedPublishers: string[];
  selectedLanguages: string[];
  query: string;
  sort: string;
  showBestSeller: boolean;
};

const SORTS = [
  ["best", "বেস্ট সেলার"],
  ["newest", "নতুন প্রকাশিত"],
  ["price-low", "দাম: কম থেকে বেশি"],
  ["price-high", "দাম: বেশি থেকে কম"],
  ["discount-high", "ছাড়: বেশি থেকে কম"],
  ["discount-low", "ছাড়: কম থেকে বেশি"],
  ["name-asc", "নাম: ক থেকে হ"],
  ["name-desc", "নাম: হ থেকে ক"],
] as const;

export default function BookFilterSort(props: Props) {
  const [sheet, setSheet] = useState<"filter" | "sort" | null>(null);
  const { categories, authors, publishers, languages, selectedCategory, selectedAuthors, selectedPublishers, selectedLanguages, query, sort, showBestSeller } = props;
  const activeCount = Number(Boolean(selectedCategory)) + selectedAuthors.length + selectedPublishers.length + selectedLanguages.length;
  const resetHref = query ? `/books?${new URLSearchParams({ q: query })}` : "/books";

  function sortHref(value: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedCategory) params.set("category", selectedCategory);
    selectedAuthors.forEach((item) => params.append("author", item));
    selectedPublishers.forEach((item) => params.append("publisher", item));
    selectedLanguages.forEach((item) => params.append("language", item));
    if (value !== "name-asc") params.set("sort", value);
    const suffix = params.toString();
    return suffix ? `/books?${suffix}` : "/books";
  }

  useEffect(() => {
    if (!sheet) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sheet]);

  const hiddenSelections = (
    <>
      {query && <input type="hidden" name="q" value={query} />}
      {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
      {selectedAuthors.map((item) => <input key={`author-${item}`} type="hidden" name="author" value={item} />)}
      {selectedPublishers.map((item) => <input key={`publisher-${item}`} type="hidden" name="publisher" value={item} />)}
      {selectedLanguages.map((item) => <input key={`language-${item}`} type="hidden" name="language" value={item} />)}
    </>
  );

  return (
    <>
      <nav aria-label="বই ফিল্টার ও সাজানোর অপশন" className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setSheet("filter")} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:border-emerald-600 focus-visible:outline-2 focus-visible:outline-emerald-700">
          <span aria-hidden="true">☷</span> ফিল্টার{activeCount > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{activeCount}</span>}
        </button>
        <button type="button" onClick={() => setSheet("sort")} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:border-emerald-600 focus-visible:outline-2 focus-visible:outline-emerald-700"><span aria-hidden="true">↕</span> সাজান</button>
        {showBestSeller && <Link href={sortHref("best")} aria-current={sort === "best" ? "true" : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-bold ${sort === "best" ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-800 shadow-sm"}`}>বেস্ট সেলার</Link>}
        <Link href={sortHref("newest")} aria-current={sort === "newest" ? "true" : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-bold ${sort === "newest" ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-800 shadow-sm"}`}>নতুন প্রকাশিত</Link>
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-[100]" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
          <div className="absolute inset-0 bg-slate-950/50" />
          <section role="dialog" aria-modal="true" aria-labelledby="catalog-sheet-title" className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-200" />
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="catalog-sheet-title" className="text-xl font-extrabold text-slate-900">{sheet === "filter" ? "ফিল্টার" : "সাজানোর ক্রম"}</h2>
              <button type="button" onClick={() => setSheet(null)} aria-label="বন্ধ করুন" className="h-10 w-10 rounded-full bg-slate-100 text-2xl text-slate-700">×</button>
            </header>
            {sheet === "sort" ? (
              <form action="/books" method="get" className="flex min-h-0 flex-1 flex-col">
                {hiddenSelections}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-2">
                  {SORTS.filter(([value]) => value !== "best" || showBestSeller).map(([value, label]) => (
                    <label key={value} className="flex min-h-14 cursor-pointer items-center gap-4 border-b border-slate-100 text-base font-semibold text-slate-800">
                      <input type="radio" name="sort" value={value} defaultChecked={sort === value} className="h-5 w-5 accent-emerald-700" />{label}
                    </label>
                  ))}
                </div>
                <footer className="border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><button type="submit" className="min-h-12 w-full rounded-full bg-emerald-700 px-5 text-base font-bold text-white hover:bg-emerald-800">প্রয়োগ করুন</button></footer>
              </form>
            ) : (
              <form action="/books" method="get" className="flex min-h-0 flex-1 flex-col">
                {query && <input type="hidden" name="q" value={query} />}
                {sort !== "name-asc" && <input type="hidden" name="sort" value={sort} />}
                <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-2">
                  <section>
                    <h3 className="mb-2 mt-3 text-lg font-bold text-slate-900">বিষয় / বিভাগ</h3>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-slate-100 text-sm"><input type="radio" name="category" value="" defaultChecked={!selectedCategory} className="h-5 w-5 accent-emerald-700" />সব বিভাগ</label>
                    {categories.map((item) => <label key={item.value} className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-slate-100 text-sm"><input type="radio" name="category" value={item.value} defaultChecked={selectedCategory === item.value} className="h-5 w-5 accent-emerald-700" />{item.label}</label>)}
                  </section>
                  {[
                    { title: "লেখক", name: "author", values: authors, selected: selectedAuthors },
                    { title: "প্রকাশক", name: "publisher", values: publishers, selected: selectedPublishers },
                    { title: "ভাষা", name: "language", values: languages, selected: selectedLanguages },
                  ].map((group) => group.values.length > 0 && (
                    <fieldset key={group.name}>
                      <legend className="mb-2 mt-4 text-lg font-bold text-slate-900">{group.title}</legend>
                      {group.values.map((value) => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-slate-100 text-sm"><input type="checkbox" name={group.name} value={value} defaultChecked={group.selected.includes(value)} className="h-5 w-5 rounded accent-emerald-700" />{value}</label>)}
                    </fieldset>
                  ))}
                </div>
                <footer className="flex gap-3 border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Link href={resetHref} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-bold text-slate-700">সব মুছুন</Link><button type="submit" className="min-h-12 flex-1 rounded-full bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800">ফিল্টার প্রয়োগ</button></footer>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
