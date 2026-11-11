"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { readCart, writeCart, type CartLine } from "@/lib/cart";
import { formatBDT } from "@/lib/money";
import { getShippingCharge } from "@/lib/shipping-fee.mjs";

type Product = { id: string; title: string; slug: string; price: number | null; image_url: string | null; commerce_mode: string | null; product_type: string };

export function CartPageClient() {
  const [items, setItems] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shippingZone, setShippingZone] = useState("dhaka_city");

  const refresh = useCallback(async () => {
    const current = readCart();
    setItems(current);
    setError("");
    if (!current.length) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: fetchError } = await supabase.from("products")
        .select("id,title,slug,price,image_url,commerce_mode,product_type")
        .in("id", current.map((item) => item.productId))
        .eq("is_published", true)
        .is("archived_at", null)
        .eq("commerce_mode", "direct");
      if (fetchError) throw fetchError;
      const valid = (data ?? []) as Product[];
      setProducts(valid);
      const ids = new Set(valid.map((product) => product.id));
      const cleaned = current.filter((item) => ids.has(item.productId));
      if (cleaned.length !== current.length) writeCart(cleaned);
      setItems(cleaned);
    } catch {
      setError("কার্টের পণ্য লোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    const onChange = () => void refresh();
    window.addEventListener("storage", onChange);
    window.addEventListener("sikkha-cart-change", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("sikkha-cart-change", onChange);
    };
  }, [refresh]);

  function update(id: string, quantity: number) {
    const next = items.map((item) => item.productId === id
      ? { ...item, quantity: Math.max(0, Math.min(99, quantity)) }
      : item).filter((item) => item.quantity > 0);
    writeCart(next);
    setItems(next);
  }

  const rows = items.map((line) => ({ line, product: products.find((product) => product.id === line.productId) }))
    .filter((row): row is { line: CartLine; product: Product } => Boolean(row.product));
  const total = rows.reduce((sum, row) => sum + (row.product.price ?? 0) * row.line.quantity, 0);
  const itemCount = rows.reduce((sum, row) => sum + row.line.quantity, 0);
  const shippingCharge = getShippingCharge(shippingZone) ?? 48;
  const payableTotal = total + shippingCharge;
  const productHref = (product: Product) => product.product_type === "book" ? `/books/${product.slug}` : product.product_type === "course" ? `/courses/${product.slug}` : `/products/${product.slug}`;
  const checkoutHref = `/checkout?products=${encodeURIComponent(rows.map((row) => row.line.productId).join(","))}&quantities=${encodeURIComponent(rows.map((row) => `${row.line.productId}:${row.line.quantity}`).join(","))}&shippingZone=${encodeURIComponent(shippingZone)}`;

  if (loading) return <p role="status" className="mt-8 rounded-2xl bg-white p-6 text-slate-600">কার্ট লোড হচ্ছে…</p>;

  return (
    <section className="mt-7">
      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</p>}
      {!rows.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
          <span aria-hidden="true" className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">🛒</span>
          <h2 className="mt-4 text-xl font-bold">আপনার কার্ট এখন খালি</h2>
          <p className="mt-2 text-sm text-slate-600">বই বা সরাসরি বিক্রির পণ্য বেছে কার্টে যোগ করুন।</p>
          <Link href="/books" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-emerald-800 px-6 py-2.5 font-bold text-white hover:bg-emerald-900">বই দেখুন</Link>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-3">
            {rows.map(({ line, product }) => (
              <article key={line.productId} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4">
                <Link href={productHref(product)} className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-1">
                  {product.image_url ? <Image src={product.image_url} alt={product.title} width={80} height={100} unoptimized className="h-full w-full object-contain" /> : <span className="text-xs text-slate-400">ছবি নেই</span>}
                </Link>
                <div className="min-w-0">
                  <Link href={productHref(product)} className="line-clamp-2 font-bold leading-6 text-slate-900 hover:text-emerald-800">{product.title}</Link>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{product.price === null ? "মূল্য নির্ধারিত নয়" : formatBDT(product.price)}</p>
                  <p className="mt-1 text-sm font-bold text-emerald-800">মোট: {formatBDT((product.price ?? 0) * line.quantity)}</p>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                  <div className="inline-flex items-center rounded-full border border-slate-300 bg-white p-1">
                    <button type="button" aria-label={`${product.title} পরিমাণ কমান`} onClick={() => update(line.productId, line.quantity - 1)} disabled={line.quantity <= 1} className="flex size-9 items-center justify-center rounded-full text-xl font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30">−</button>
                    <output aria-live="polite" className="min-w-9 text-center text-base font-bold tabular-nums">{line.quantity}</output>
                    <button type="button" aria-label={`${product.title} পরিমাণ বাড়ান`} onClick={() => update(line.productId, line.quantity + 1)} disabled={line.quantity >= 99} className="flex size-9 items-center justify-center rounded-full text-xl font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30">+</button>
                  </div>
                  <button type="button" onClick={() => update(line.productId, 0)} className="inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">সরিয়ে ফেলুন</button>
                </div>
              </article>
            ))}
            <Link href="/books" className="inline-flex min-h-10 w-fit items-center px-1 text-sm font-semibold text-emerald-800 hover:underline">← কেনাকাটা চালিয়ে যান</Link>
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-extrabold">অর্ডার সারাংশ</h2>
            <div className="mt-4 flex justify-between text-sm text-slate-600"><span>পণ্যের সংখ্যা</span><span className="font-semibold text-slate-900">{itemCount}টি</span></div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <label htmlFor="cart-shipping-zone" className="mb-2 block text-sm font-semibold text-slate-700">ডেলিভারি এলাকা নির্বাচন করুন</label>
              <select id="cart-shipping-zone" value={shippingZone} onChange={(event) => setShippingZone(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                <option value="dhaka_city">ঢাকা সিটি — ৳৪৮ থেকে</option>
                <option value="district_town">জেলা সদর / পৌরসভা — ৳৫২ থেকে</option>
                <option value="remote_union">দূরবর্তী এলাকা / ইউনিয়ন — ৳৫৭ থেকে</option>
              </select>
            </div>
            <div className="mt-4 flex justify-between text-sm text-slate-600"><span>পণ্যের মূল্য</span><span className="font-semibold">{formatBDT(total)}</span></div>
            <div className="mt-2 flex justify-between text-sm text-slate-600"><span>ডেলিভারি চার্জ (প্রাথমিক)</span><span className="font-semibold">{formatBDT(shippingCharge)}</span></div>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3"><span className="font-semibold">সর্বমোট</span><span className="text-xl font-extrabold text-emerald-800">{formatBDT(payableTotal)}</span></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">পণ্যের ধরন, সংখ্যা, ওজন ও নির্দিষ্ট লোকেশন অনুযায়ী চূড়ান্ত চার্জ পরিবর্তিত হতে পারে। Checkout-এ ঠিকানা দিয়ে আবার যাচাই করুন।</p>
            <Link href={checkoutHref} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-emerald-800 px-5 py-3 text-center font-bold text-white transition hover:bg-emerald-900">Checkout-এ যান</Link>
          </aside>
        </div>
      )}
    </section>
  );
}
