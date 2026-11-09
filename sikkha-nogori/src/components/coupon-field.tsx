"use client";

import { useState } from "react";

export type PublicCoupon = { code: string; percent: number; description: string; expiresAt: string | null; minOrder: number };

function expiry(value: string | null) {
  return value
    ? `মেয়াদ: ${new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "medium" }).format(new Date(value))} পর্যন্ত`
    : "মেয়াদহীন অফার";
}

export function CouponField({ coupons }: { coupons: PublicCoupon[] }) {
  const [code, setCode] = useState("");
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-bold">কুপন কোড</h2>
      <p className="mt-1 text-sm text-slate-500">কুপন থাকলে কোডটি লিখুন; ছাড় অর্ডারের মোট থেকে বাদ যাবে। না থাকলে ঘরটি খালি রাখুন।</p>
      <div className="mt-4 max-w-sm">
        <label htmlFor="coupon-code" className="sr-only">কুপন কোড</label>
        <input
          id="coupon-code"
          name="couponCode"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          maxLength={20}
          autoComplete="off"
          placeholder="যেমন EID20"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono uppercase tracking-wider"
        />
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
