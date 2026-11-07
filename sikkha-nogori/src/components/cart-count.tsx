"use client";

import { useEffect, useState } from "react";
import { readCart } from "@/lib/cart";

/** Small red count bubble that updates whenever the cart changes. */
export function CartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(readCart().reduce((sum, line) => sum + line.quantity, 0));
    sync();
    window.addEventListener("sikkha-cart-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sikkha-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (count <= 0) return null;
  return <span aria-label={`কার্টে ${count}টি পণ্য`} className="absolute -right-2 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{count > 99 ? "99+" : count}</span>;
}
