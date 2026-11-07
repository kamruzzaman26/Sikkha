"use client";

import { useState } from "react";
import { addCartItem } from "@/lib/cart";
import { showToast } from "@/lib/toast";

export function AddToCartButton({ productId, variant = "default" }: { productId: string; variant?: "default" | "bar" }) {
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");

  function handleAdd() {
    try {
      addCartItem(productId);
      setStatus("added");
      showToast({ message: "কার্টে যোগ হয়েছে", href: "/cart", actionLabel: "কার্ট দেখুন" });
      window.setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      showToast({ message: "কার্টে যোগ করা যায়নি", tone: "error" });
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
          {status === "added" ? "✓ Added to Cart" : status === "error" ? "Try again" : "Add to Cart"}
        </button>
        <p role={status === "error" ? "alert" : "status"} className={status === "error" ? "mt-1 text-center text-xs text-rose-700" : "sr-only"}>
          {status === "added" ? "Item added to your cart." : status === "error" ? "Could not add to cart." : ""}
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAdd}
        aria-live="polite"
        className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-sky-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {status === "added" ? "✓ Added to Cart" : status === "error" ? "Try again" : "Add to Cart"}
      </button>
      <p role={status === "error" ? "alert" : "status"} className={status === "error" ? "mt-1 text-center text-xs text-rose-700" : "sr-only"}>
        {status === "added" ? "Item added to your cart." : status === "error" ? "Could not add to cart. Check your browser storage permission." : ""}
      </p>
    </div>
  );
}
