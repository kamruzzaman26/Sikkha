"use client";
import { useState } from "react";
import { addCartItem } from "@/lib/cart";
export function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return <button type="button" onClick={() => { addCartItem(productId); setAdded(true); }} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 px-4 py-2.5 font-bold text-emerald-800 hover:bg-emerald-50">{added ? "কার্টে যোগ হয়েছে ✓" : "কার্টে যোগ করুন"}</button>;
}
