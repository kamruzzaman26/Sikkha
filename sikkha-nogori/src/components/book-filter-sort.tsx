"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  categories: { label: string; value: string }[];
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
] as const;

export default function BookFilterSort({
  categories,
  authors,
  publishers,
  languages,
  selectedCategory,
  selectedAuthors,
  selectedPublishers,
  selectedLanguages,
  query,
  sort,
  showBestSeller,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const activeCount = Number(Boolean(selectedCategory)) + selectedAuthors.length + selectedPublishers.length + selectedLanguages.length;
  const resetHref = query ? `/books?${new URLSearchParams({ q: query })}` : "/books";
  const sortHref = (value: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedCategory) params.set("category", selectedCategory);
    selectedAuthors.forEach((value) => params.append("author", value));
    selectedPublishers.forEach((value) => params.append("publisher", value));
    selectedLanguages.forEach((value) => params.append("language", value));
    if (value !== "name-asc") params.set("sort", value);
    const suffix = params.toString();
    return suffix ? `/books?${suffix}` : "/books";
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-emerald-600">
          ফিল্টার{activeCount > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{activeCount}</span>}
        </button>
        <button type="button" onClick={() => setOpen(true)} className="min-h-10 shrink-0 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-emerald-600">সাজান</button>
        {showBestSeller && <Link href={sortHref("best")} aria-current={sort === "best" ? "true" : undefined} className={`inline-flex min-h-10 shrink-0 items-center rounded-lg px-4 text-sm font-bold ${sort === "best" ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-800"}`}>বেস্ট সেলার</Link>}
        <Link href={sortHref("newest")} aria-current={sort === "newest" ? "true" : undefined} className={`inline-flex min-h-10 shrink-0 items-center rounded-lg px-4 text-sm font-bold ${sort === "newest" ? "bg-emerald-700 text-white" : "border border-slate-300 bg-white text-slate-800"}`}>নতুন প্রকাশিত</Link>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="absolute inset-0 bg-slate-950/50" />
          <section role="dialog" aria-modal="true" aria-labelledby="book-filter-title" className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="book-filter-title" className="text-xl font-extrabold text-slate-900">বই ফিল্টার ও সাজান</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="ফিল্টার বন্ধ করুন" className="h-10 w-10 rounded-full bg-slate-100 text-2xl text-slate-700">×</button>
            </header>
            <form action="/books" method="get" className="flex min-h-0 flex-1 flex-col">
              {query && <input type="hidden" name="q" value={query} />}
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-2">
                <section>
                  <h3 className="mb-2 mt-4 font-bold text-slate-900">সাজান</h3>
                  <select name="sort" defaultValue={sort} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100">
                    {SORTS.filter(([value]) => value !== "best" || showBestSeller).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    <option value="name-asc">নাম: ক থেকে হ</option>
                    <option value="name-desc">নাম: হ থেকে ক</option>
                  </select>
                </section>
                <section>
                  <h3 className="mb-2 mt-4 font-bold text-slate-900">বিষয় / বিভাগ</h3>
                  <label className="flex min-h-11 items-center gap-3 border-b border-slate-100 text-sm"><input type="radio" name="category" value="" defaultChecked={!selectedCategory} className="h-4 w-4 accent-emerald-700" />সব বিভাগ</label>
                  {categories.map((item) => <label key={item.value} className="flex min-h-11 items-center gap-3 border-b border-slate-100 text-sm"><input type="radio" name="category" value={item.value} defaultChecked={selectedCategory === item.value} className="h-4 w-4 accent-emerald-700" />{item.label}</label>)}
                </section>
                {[{ title: "লেখক", name: "author", values: authors, selected: selectedAuthors }, { title: "প্রকাশক", name: "publisher", values: publishers, selected: selectedPublishers }, { title: "ভাষা", name: "language", values: languages, selected: selectedLanguages }].map((group) => group.values.length > 0 && (
                  <fieldset key={group.name}>
                    <legend className="mb-2 mt-4 font-bold text-slate-900">{group.title}</legend>
                    {group.values.map((value) => <label key={value} className="flex min-h-11 items-center gap-3 border-b border-slate-100 text-sm"><input type="checkbox" name={group.name} value={value} defaultChecked={group.selected.includes(value)} className="h-4 w-4 rounded accent-emerald-700" />{value}</label>)}
                  </fieldset>
                ))}
              </div>
              <footer className="flex gap-3 border-t border-slate-100 p-4">
                <Link href={resetHref} className="flex-1 rounded-full border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-700">সব মুছুন</Link>
                <button type="submit" className="flex-1 rounded-full bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">ফলাফল দেখুন</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
