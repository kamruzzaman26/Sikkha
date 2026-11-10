"use server";

import { requireCustomer } from "@/lib/supabase/auth";
import { getCheckoutOptions } from "@/lib/supabase/checkout";

export type CouponPreview =
  | { state: "idle" }
  | { state: "empty" }
  | { state: "error"; message: string }
  | { state: "ok"; code: string; percent: number; subtotal: number; discount: number; total: number };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const failure: Record<string, string> = {
  not_found: "কুপন কোডটি সঠিক নয়। আবার দেখে লিখুন।",
  inactive: "এই কুপনটি এখন চালু নেই।",
  not_started: "এই কুপনটি এখনো শুরু হয়নি।",
  expired: "এই কুপনের মেয়াদ শেষ হয়ে গেছে।",
  used_up: "এই কুপনের ব্যবহারের সীমা শেষ।",
  min_order: "এই কুপনের জন্য আরও বেশি মূল্যের অর্ডার প্রয়োজন।",
};

/** Sum of the selected products' current server prices (never trusts the browser). */
export async function selectedSubtotal(items: { id: string; quantity: number }[]): Promise<number> {
  const { products } = await getCheckoutOptions();
  const prices = new Map((products ?? []).map((p) => [p.id.toLowerCase(), Number(p.price)]));
  let sum = 0;
  for (const item of items) {
    const price = prices.get(item.id.toLowerCase());
    if (price === undefined) continue;
    sum += price * item.quantity;
  }
  return Math.round(sum * 100) / 100;
}

export async function previewCoupon(_previous: CouponPreview, formData: FormData): Promise<CouponPreview> {
  const { supabase } = await requireCustomer();
  const raw = formData.get("couponCode");
  const code = typeof raw === "string" ? raw.trim().toUpperCase().slice(0, 20) : "";
  if (!code) return { state: "empty" };

  const items: { id: string; quantity: number }[] = [];
  for (const entry of formData.getAll("productId")) {
    if (typeof entry !== "string" || !uuid.test(entry)) continue;
    const q = formData.get(`quantity-${entry}`);
    const quantity = typeof q === "string" && /^[1-9]\d?$/.test(q.trim()) ? Number(q) : 1;
    items.push({ id: entry, quantity });
  }
  if (items.length === 0) return { state: "error", message: "আগে অন্তত একটি পণ্য নির্বাচন করুন।" };

  const subtotal = await selectedSubtotal(items);
  const { data, error } = await supabase.rpc("preview_coupon", { p_code: code, p_subtotal: subtotal });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return { state: "error", message: "কুপন যাচাই করা যায়নি। একটু পরে আবার চেষ্টা করুন।" };
  if (row.status !== "ok") return { state: "error", message: failure[row.status as string] ?? failure.not_found };

  const discount = Number(row.discount);
  return { state: "ok", code, percent: Number(row.discount_percent), subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100 };
}
