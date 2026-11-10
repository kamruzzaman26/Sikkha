"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { previewCoupon, type CouponPreview } from "@/app/checkout/coupon-actions";

export type PublicCoupon = { code: string; percent: number; description: string; expiresAt: string | null; minOrder: number };

const money = (n: number) => `৳${n.toLocaleString("bn-BD", { maximumFractionDigits: 2 })}`;

function expiry(value: string | null) {
  return value
    ? `মেয়াদ: ${new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "medium" }).format(new Date(value))} পর্যন্ত`
    : "মেয়াদহীন অফার";
}

/** Coupon box with a green "Apply now" button. Lives inside the product form. */
export function CouponField({ coupons, initialCode = "" }: { coupons: PublicCoupon[]; initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [result, dispatch] = useActionState<CouponPreview, FormData>(previewCoupon, { state: "idle" });
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  function apply() {
    const form = box.current?.closest("form");
    if (!form) return;
    startTransition(() => dispatch(new FormData(form)));
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-bold">কুপন কোড</h2>
      <p className="mt-1 text-sm text-slate-500">কুপন থাকলে কোড লিখে “Apply now” চাপুন। না থাকলে এড়িয়ে যান।</p>

      <div ref={box} className="mt-4 flex max-w-md items-stretch gap-2">
        <label htmlFor="coupon-code" className="sr-only">কুপন কোড</label>
        <input
          id="coupon-code"
          name="couponCode"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
          maxLength={20}
          autoComplete="off"
          placeholder="কুপন কোড লিখুন"
          className="min-h-12 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 font-mono uppercase tracking-wider"
        />
        <button
          type="button"
          onClick={apply}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-[#006b4f] px-5 font-bold text-white transition hover:bg-[#005a42] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "যাচাই হচ্ছে…" : "Apply now"}
        </button>
      </div>

      <div aria-live="polite" className="mt-3">
        {result.state === "error" && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{result.message}</p>
        )}
        {result.state === "ok" && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <p className="font-bold">✓ {result.code} প্রয়োগ হয়েছে — {result.percent}% ছাড়</p>
            <p className="mt-1">পণ্যের মূল্য {money(result.subtotal)} · ছাড় −{money(result.discount)} · <b>প্রদেয় {money(result.total)}</b></p>
            <p className="mt-1 text-xs text-emerald-800">ডেলিভারি চার্জ (থাকলে) আলাদা। চূড়ান্ত অর্ডারে মূল্য সার্ভার আবার যাচাই করবে।</p>
          </div>
        )}
      </div>

      {coupons.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-700">চালু অফার (ট্যাপ করে কোড বসান)</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {coupons.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => setCode(c.code)}
                  aria-pressed={code === c.code}
                  className={`w-full rounded-xl border p-3 text-left transition ${code === c.code ? "border-emerald-600 bg-emerald-50" : "border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-extrabold tracking-wider text-emerald-900">{c.code}</span>
                    <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-bold text-white">{c.percent}% ছাড়</span>
                  </span>
                  {c.description && <span className="mt-1 block text-sm text-slate-700">{c.description}</span>}
                  <span className="mt-1 block text-xs text-slate-500">
                    {expiry(c.expiresAt)}{c.minOrder > 0 ? ` · ন্যূনতম অর্ডার ৳${c.minOrder}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
