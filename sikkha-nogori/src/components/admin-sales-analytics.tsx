"use client";

import { useMemo, useState } from "react";
import { formatBDT } from "@/lib/money";

type Order = {
  payment_status: string;
  created_at: string;
  total_amount: number | string;
};

type Period = 7 | 30 | 90;

function dhakaDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

export function SalesAnalytics({ orders, todayKey }: { orders: Order[]; todayKey: string }) {
  const [period, setPeriod] = useState<Period>(7);
  const analytics = useMemo(() => {
    const startKey = addDays(todayKey, -(period - 1));
    const matching = orders.filter((order) => {
      if (order.payment_status !== "verified") return false;
      const key = dhakaDateKey(order.created_at);
      return key >= startKey && key <= todayKey;
    });
    const bucketCount = period === 7 ? 7 : period === 30 ? 10 : 13;
    const bucketDays = period === 7 ? 1 : period === 30 ? 3 : 7;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const from = addDays(startKey, index * bucketDays);
      const to = addDays(startKey, Math.min(period - 1, (index + 1) * bucketDays - 1));
      const amount = matching.reduce((sum, order) => {
        const key = dhakaDateKey(order.created_at);
        return key >= from && key <= to ? sum + (Number(order.total_amount) || 0) : sum;
      }, 0);
      return { key: from, label: period === 7
        ? new Date(`${from}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
        : new Date(`${from}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" }), amount };
    }).filter((bucket) => bucket.key <= todayKey);
    return {
      buckets,
      total: matching.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0),
      count: matching.length,
      max: Math.max(1, ...buckets.map((bucket) => bucket.amount)),
    };
  }, [orders, period, todayKey]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Sales Overview</h2>
          <p className="mt-1 text-xs text-slate-500">Payment-verified revenue · {period} days</p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1" aria-label="Sales chart period">
          {([7, 30, 90] as const).map((days) => (
            <button key={days} type="button" onClick={() => setPeriod(days)} aria-pressed={period === days}
              className={`min-h-9 rounded-lg px-3 text-xs font-bold transition ${period === days ? "bg-white text-blue-800 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
              {days}D
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Verified sales in selected period</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">{formatBDT(analytics.total)}</p>
        </div>
        <p className="text-xs font-semibold text-slate-500">{analytics.count} verified orders</p>
      </div>
      <div className="mt-6 grid grid-cols-[auto_1fr] gap-3">
        <div className="flex h-44 flex-col justify-between pb-6 text-[10px] text-slate-400">
          <span>{formatBDT(analytics.max)}</span><span>{formatBDT(analytics.max * .5)}</span><span>৳0</span>
        </div>
        <div className="relative h-44 border-b border-slate-200">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
            <span className="border-t border-dashed border-slate-200" /><span className="border-t border-dashed border-slate-200" /><span className="border-t border-slate-200" />
          </div>
          <div className="relative flex h-full items-end justify-around gap-1.5 px-1 pb-6 sm:gap-2 sm:px-2">
            {analytics.buckets.map((bucket) => (
              <div key={bucket.key} className="flex h-full min-w-0 flex-1 items-end justify-center">
                <div title={`${bucket.label}: ${formatBDT(bucket.amount)}`} className="w-full max-w-10 rounded-t-md bg-blue-600 transition hover:bg-blue-700"
                  style={{ height: bucket.amount > 0 ? `${Math.max(4, bucket.amount / analytics.max * 82)}%` : "3px" }} />
                {(period === 7 || analytics.buckets.length <= 10 || Number(bucket.key.slice(-2)) % 2 === 1) && (
                  <span className="absolute bottom-0 max-w-full truncate text-[9px] font-medium text-slate-500">{bucket.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {analytics.count === 0 && <p className="mt-2 text-center text-xs text-slate-500">No verified sales in this period.</p>}
      <p className="mt-4 text-[11px] leading-5 text-slate-400">Analytics use the latest 1,000 orders loaded for this dashboard. Sales include only payment-verified orders.</p>
    </section>
  );
}
