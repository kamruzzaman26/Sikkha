"use client";

import { useState } from "react";
import { addCartItem } from "@/lib/cart";

export function AddToCartButton({ productId, variant = "default" }: { productId: string; variant?: "default" | "bar" }) {
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");

  function handleAdd() {
    try {
      addCartItem(productId);
      setStatus("added");
    } catch {
      setStatus("error");
    }
  }

  if (variant === "bar") {
    return (
      <div>
        <button
          type="button"
          onClick={handleAdd}
          aria-live="polite"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-base font-bold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.7l2.3 11.2h10.2l2-8H6.2" /></svg>
          {status === "added" ? "✓ কার্টে যোগ হয়েছে" : status === "error" ? "আবার চেষ্টা করুন" : "কার্টে যোগ করুন"}
        </button>
        <p role={status === "error" ? "alert" : "status"} className={status === "error" ? "mt-1 text-center text-xs text-rose-700" : "sr-only"}>
          {status === "added" ? "পণ্যটি কার্টে যোগ হয়েছে।" : status === "error" ? "কার্টে যোগ করা যায়নি।" : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleAdd}
        aria-live="polite"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        {status === "added" ? "✓ কার্টে যোগ হয়েছে" : status === "error" ? "আবার চেষ্টা করুন" : "🛒 কার্টে যোগ করুন"}
      </button>
      <p role={status === "error" ? "alert" : "status"} className={status === "error" ? "mt-1 text-center text-xs text-rose-700" : "sr-only"}>
        {status === "added" ? "পণ্যটি কার্টে যোগ হয়েছে।" : status === "error" ? "কার্টে যোগ করা যায়নি। ব্রাউজারের স্টোরেজ অনুমতি পরীক্ষা করুন।" : ""}
      </p>
    </div>
  );
}
