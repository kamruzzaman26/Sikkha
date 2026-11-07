"use client";

import { useEffect, useState } from "react";
import {
  readWishlist,
  WISHLIST_CHANGE_EVENT,
  writeWishlist,
} from "@/lib/wishlist";
import { showToast } from "@/lib/toast";

export function WishlistButton({ slug, variant = "button" }: { slug: string; variant?: "button" | "icon" }) {
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
      showToast({ message: saved ? "Saved তালিকা থেকে সরানো হয়েছে" : "Saved তালিকায় যোগ হয়েছে", tone: saved ? "info" : "success" });
    } catch {
      setError("Could not update wishlist. Check your browser storage permission.");
      showToast({ message: "Save করা যায়নি", tone: "error" });
    }
  }

  if (variant === "icon") {
    return (
      <div>
        <button type="button" onClick={toggleSaved} aria-pressed={saved} className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 px-2 text-sm font-medium text-slate-700 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          <svg aria-hidden="true" className={`size-6 ${saved ? "text-rose-600" : ""}`} viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
            <path d="M20.2 8.8c0 4.2-8.2 10-8.2 10s-8.2-5.8-8.2-10a4.4 4.4 0 0 1 8.2-2.2 4.4 4.4 0 0 1 8.2 2.2Z" />
          </svg>
          {saved ? "Saved" : "Save"}
        </button>
        {error && <p role="status" className="text-center text-xs text-rose-700">{error}</p>}
      </div>
    );
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
        {saved ? "In Wishlist" : "Add to Wishlist"}
      </button>
      {error && (
        <p role="status" className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
