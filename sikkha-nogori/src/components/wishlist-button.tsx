"use client";

import { useEffect, useState } from "react";
import {
  readWishlist,
  WISHLIST_CHANGE_EVENT,
  writeWishlist,
} from "@/lib/wishlist";

export function WishlistButton({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function syncSavedState() {
      try {
        setSaved(readWishlist().includes(slug));
        setError("");
      } catch {
        setError("উইশলিস্ট পড়া যায়নি। ব্রাউজারের সংরক্ষিত তথ্য পরীক্ষা করুন।");
      }
    }

    syncSavedState();
    window.addEventListener(WISHLIST_CHANGE_EVENT, syncSavedState);
    window.addEventListener("storage", syncSavedState);
    return () => {
      window.removeEventListener(WISHLIST_CHANGE_EVENT, syncSavedState);
      window.removeEventListener("storage", syncSavedState);
    };
  }, [slug]);

  function toggleSaved() {
    try {
      const current = readWishlist();
      const next = saved
        ? current.filter((savedSlug) => savedSlug !== slug)
        : [...current, slug];
      writeWishlist(next);
      setSaved(!saved);
      setError("");
    } catch {
      setError("উইশলিস্ট সংরক্ষণ করা যায়নি। ব্রাউজারের storage অনুমতি পরীক্ষা করুন।");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleSaved}
        aria-pressed={saved}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <svg
          aria-hidden="true"
          className="size-4"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20.2 8.8c0 4.2-8.2 10-8.2 10s-8.2-5.8-8.2-10a4.4 4.4 0 0 1 8.2-2.2 4.4 4.4 0 0 1 8.2 2.2Z" />
        </svg>
        {saved ? "উইশলিস্টে আছে" : "উইশলিস্টে রাখুন"}
      </button>
      {error && (
        <p role="status" className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
