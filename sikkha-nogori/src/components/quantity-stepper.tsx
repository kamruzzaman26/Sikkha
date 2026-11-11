"use client";

import { useState } from "react";

export function QuantityStepper({ id, name, defaultValue = 1 }: { id: string; name: string; defaultValue?: number }) {
  const [quantity, setQuantity] = useState(() => Math.max(1, Math.min(99, Math.trunc(defaultValue) || 1)));
  const update = (value: number) => setQuantity(Math.max(1, Math.min(99, Math.trunc(value) || 1)));

  return (
    <div className="inline-flex min-h-12 items-center rounded-full border border-slate-300 bg-white p-1 shadow-sm">
      <button type="button" aria-label="পরিমাণ কমান" onClick={() => update(quantity - 1)} disabled={quantity <= 1} className="flex size-10 items-center justify-center rounded-full text-xl font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30">−</button>
      <input id={id} type="number" inputMode="numeric" min={1} max={99} step={1} value={quantity} onChange={(event) => update(Number(event.target.value))} aria-label="পণ্যের পরিমাণ" className="w-12 border-0 bg-transparent p-0 text-center text-base font-bold tabular-nums text-slate-900 outline-none focus:ring-0" />
      <button type="button" aria-label="পরিমাণ বাড়ান" onClick={() => update(quantity + 1)} disabled={quantity >= 99} className="flex size-10 items-center justify-center rounded-full text-xl font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30">+</button>
      <input type="hidden" name={name} value={quantity} />
    </div>
  );
}
