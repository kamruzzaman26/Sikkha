"use client";

import { useState } from "react";
import { formatBDT } from "@/lib/money";
import { getShippingCharge } from "@/lib/shipping-fee.mjs";

const options = [
  { value: "dhaka_city", label: "ঢাকা সিটি", detail: "ঢাকা মহানগর এলাকার জন্য" },
  { value: "district_town", label: "জেলা সদর / পৌরসভা", detail: "ঢাকার বাইরের জেলা সদর ও পৌরসভা" },
  { value: "remote_union", label: "দূরবর্তী এলাকা / ইউনিয়ন", detail: "ইউনিয়ন বা দূরবর্তী এলাকার জন্য" },
] as const;

export function ShippingChargeSelector({
  subtotal,
  discount,
  required,
  initialZone = "dhaka_city",
}: {
  subtotal: number;
  discount: number;
  required: boolean;
  initialZone?: string;
}) {
  const allowedZones = ["dhaka_city", "district_town", "remote_union"];
  const [zone, setZone] = useState(allowedZones.includes(initialZone) ? initialZone : "dhaka_city");
  const charge = required ? getShippingCharge(zone) ?? 0 : 0;
  const total = Math.max(0, subtotal - discount) + charge;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-bold">ডেলিভারি চার্জ</h2>
      {required ? (
        <>
          <p className="mt-1 text-sm leading-6 text-slate-600">আপনার ঠিকানার এলাকার ধরন নির্বাচন করুন। ঠিকানার সঙ্গে মিলিয়ে সঠিক অপশনটি বেছে নিন।</p>
          <fieldset className="mt-4 grid gap-3">
            <legend className="sr-only">ডেলিভারি এলাকার ধরন</legend>
            {options.map((option) => (
              <label key={option.value} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition ${zone === option.value ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-emerald-300"}`}>
                <span className="flex min-w-0 items-start gap-3">
                  <input type="radio" name="shippingZoneChoice" value={option.value} checked={zone === option.value} onChange={() => setZone(option.value)} className="mt-1 size-4 shrink-0 accent-emerald-700" />
                  <span><span className="block font-semibold">{option.label}</span><span className="mt-1 block text-xs text-slate-500">{option.detail}</span></span>
                </span>
                <span className="shrink-0 font-bold text-slate-900">{formatBDT(getShippingCharge(option.value) ?? 0)}</span>
              </label>
            ))}
          </fieldset>
          <input type="hidden" name="shippingZone" value={zone} />
          <p className="mt-3 text-xs leading-5 text-slate-500">এগুলো প্রাথমিক চার্জ। রকমারির মতো পণ্যের ধরন, সংখ্যা, ওজন ও নির্দিষ্ট ডেলিভারি লোকেশন অনুযায়ী চূড়ান্ত চার্জ বাড়তে পারে। বর্তমানে এখানে এলাকা-ভিত্তিক শুরুর হার হিসাব করা হচ্ছে।</p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">আপনার অর্ডারে শুধু ডিজিটাল পণ্য রয়েছে, তাই ডেলিভারি চার্জ প্রযোজ্য নয়।</p>
          <input type="hidden" name="shippingZone" value="no_shipping" />
        </>
      )}
      <dl className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-slate-600">পণ্যের মূল্য</dt><dd className="font-semibold">{formatBDT(subtotal)}</dd></div>
        {discount > 0 && <div className="flex justify-between text-emerald-800"><dt>কুপন ছাড়</dt><dd className="font-semibold">−{formatBDT(discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-slate-600">ডেলিভারি চার্জ</dt><dd className="font-semibold">{formatBDT(charge)}</dd></div>
        <div className="flex justify-between border-t border-slate-100 pt-3 text-lg"><dt className="font-bold">সর্বমোট</dt><dd className="font-extrabold text-emerald-800">{formatBDT(total)}</dd></div>
      </dl>
    </section>
  );
}
