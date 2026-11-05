"use client";

import { useState } from "react";
import { addCartItem } from "@/lib/cart";

export function AddToCartButton({ productId }: { productId: string }) {
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");

  function handleAdd() {
    try {
      addCartItem(productId);
      setStatus("added");
    } catch {
      setStatus("error");
    }
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
