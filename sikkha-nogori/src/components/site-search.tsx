"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Suggestion = { title: string; slug: string; author: string | null };

export function SiteSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/book-suggestions?q=${encodeURIComponent(term)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Suggestions unavailable");
        const data = await response.json() as { suggestions?: Suggestion[] };
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setOpen(true);
        setActiveIndex(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function closeEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? suggestions.length - 1 : current - 1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      router.push(`/books/${encodeURIComponent(suggestions[activeIndex].slug)}`);
    }
  }

  return (
    <div ref={rootRef} className="relative order-3 w-full lg:order-none lg:min-w-0 lg:flex-1">
      <form action="/search" method="get" role="search">
        <label className="sr-only" htmlFor="site-search">বইয়ের নাম, লেখক বা কোর্স খুঁজুন</label>
        <div className="flex min-h-11 rounded-xl border border-slate-200 bg-[#f8faf9] p-1 transition focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
          <span aria-hidden="true" className="flex items-center pl-2.5 text-slate-500">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
          </span>
          <input
            id="site-search"
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => { if (suggestions.length) setOpen(true); }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="book-search-suggestions"
            placeholder="বইয়ের নাম, লেখক বা কোর্স লিখুন"
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-500"
          />
          <button type="submit" aria-label="Search" className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#006b4f] px-3 text-sm font-bold text-white transition hover:bg-[#005640] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </form>

      {open && query.trim().length >= 2 && (
        <div id="book-search-suggestions" role="listbox" aria-label="বইয়ের নামের সাজেশন" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {loading && <p className="px-4 py-3 text-sm text-slate-500">খোঁজা হচ্ছে…</p>}
          {!loading && suggestions.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">মিল থাকা বই পাওয়া যায়নি। Enter চাপলে সম্পূর্ণ সার্চ হবে।</p>}
          {suggestions.map((item, index) => (
            <Link
              key={item.slug}
              href={`/books/${item.slug}`}
              role="option"
              aria-selected={activeIndex === index}
              onClick={() => setOpen(false)}
              className={`block border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-emerald-50 ${activeIndex === index ? "bg-emerald-50" : ""}`}
            >
              <span className="block line-clamp-1 text-sm font-semibold text-slate-900">{item.title}</span>
              {item.author && <span className="mt-0.5 block line-clamp-1 text-xs text-slate-500">{item.author}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
