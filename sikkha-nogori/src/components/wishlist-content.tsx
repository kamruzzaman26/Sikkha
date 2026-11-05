"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readWishlist,
  WISHLIST_CHANGE_EVENT,
  type WishlistEntry,
  writeWishlist,
} from "@/lib/wishlist";

export function WishlistContent({ entries }: { entries: WishlistEntry[] }) {
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function syncWishlist() {
      try {
        const storedSlugs = readWishlist();
        const availableSlugs = new Set(entries.map((entry) => entry.slug));
        const validSlugs = storedSlugs.filter((slug) =>
          availableSlugs.has(slug),
        );
        setSavedSlugs(validSlugs);
        setError("");

        if (validSlugs.length !== storedSlugs.length) {
          try {
            writeWishlist(validSlugs);
          } catch {
            setError(
              "অকার্যকর সংরক্ষিত পণ্য সরানো যায়নি। ব্রাউজারের storage অনুমতি পরীক্ষা করুন।",
            );
          }
        }
      } catch {
        setError("উইশলিস্ট পড়া যায়নি। ব্রাউজারের সংরক্ষিত তথ্য পরীক্ষা করুন।");
      } finally {
        setLoaded(true);
      }
    }

    syncWishlist();
    window.addEventListener(WISHLIST_CHANGE_EVENT, syncWishlist);
    window.addEventListener("storage", syncWishlist);
    return () => {
      window.removeEventListener(WISHLIST_CHANGE_EVENT, syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, [entries]);

  function removeEntry(slug: string) {
    try {
      const next = savedSlugs.filter((savedSlug) => savedSlug !== slug);
      writeWishlist(next);
      setSavedSlugs(next);
      setError("");
    } catch {
      setError("উইশলিস্ট হালনাগাদ করা যায়নি। ব্রাউজারের storage অনুমতি পরীক্ষা করুন।");
    }
  }

  const savedEntries = entries.filter((entry) =>
    savedSlugs.includes(entry.slug),
  );

  return (
    <main className="min-h-[60vh] bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span>উইশলিস্ট</span>
        </nav>
        <header className="mt-6">
          <h1 className="text-3xl font-extrabold sm:text-4xl">উইশলিস্ট</h1>
          <p className="mt-2 leading-7 text-slate-600">
            এই তালিকা শুধু এই ব্রাউজারে সংরক্ষিত; এটি অ্যাকাউন্টের সঙ্গে sync হয় না।
          </p>
        </header>

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-rose-800">
            {error}
          </p>
        )}

        {!loaded ? (
          <p role="status" className="mt-8 rounded-xl bg-white px-5 py-8 text-slate-600">
            উইশলিস্ট লোড হচ্ছে…
          </p>
        ) : savedEntries.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {savedEntries.map((entry) => (
              <article
                key={entry.slug}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <Link
                  href={entry.href}
                  aria-label={`পণ্যের বিস্তারিত: ${entry.title}`}
                  className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 p-4"
                >
                  {entry.imageUrl ? (
                    <Image
                      src={entry.imageUrl}
                      alt={`${entry.title} পণ্যের ছবি`}
                      width={200}
                      height={260}
                      unoptimized
                      className="max-h-52 w-auto max-w-full object-contain"
                    />
                  ) : (
                    <span
                      role="img"
                      aria-label={`${entry.title} পণ্যের ছবি নেই`}
                      className="text-sm font-semibold text-slate-500"
                    >
                      ছবি নেই
                    </span>
                  )}
                </Link>
                {entry.category && (
                  <p className="mt-3 text-xs font-semibold text-emerald-700">
                    {entry.category}
                  </p>
                )}
                <Link href={entry.href} className="mt-1 flex-1">
                  <h2 className="line-clamp-2 font-bold leading-6 text-slate-900 hover:text-emerald-800">
                    {entry.title}
                  </h2>
                </Link>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.slug)}
                  aria-label={`${entry.title} উইশলিস্ট থেকে সরান`}
                  className="mt-3 min-h-11 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700"
                >
                  তালিকা থেকে সরান
                </button>
              </article>
            ))}
          </div>
        ) : (
          <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <h2 className="text-xl font-bold">এখনো কোনো পণ্য সংরক্ষণ করা হয়নি</h2>
            <p className="mt-2 text-sm text-slate-600">
              পণ্যের কার্ড বা বিস্তারিত থেকে “উইশলিস্টে রাখুন” বেছে নিন।
            </p>
            <Link
              href="/products"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              পণ্য দেখুন
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
