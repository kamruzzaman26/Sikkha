import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { placeOrder } from "../actions";
import { AddressFields } from "@/components/address-fields";
import { SubmitButton } from "@/components/submit-button";
import { ShippingChargeSelector } from "@/components/shipping-charge-selector";
import { formatBDT } from "@/lib/money";
import { getShippingCharges } from "@/lib/shipping-fee.mjs";
import { isNoActiveSessionError } from "@/lib/supabase/auth-errors";
import { getCheckoutOptions } from "@/lib/supabase/checkout";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "ডেলিভারি ও পেমেন্ট | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusMessages: Record<string, string> = {
  invalid: "তথ্য যাচাই করুন: নাম, মোবাইল নম্বর, ঠিকানা ও পেমেন্ট মেথড সঠিকভাবে পূরণ করুন।",
  unavailable: "নির্বাচিত পণ্য বা পেমেন্ট মেথড এখন উপলভ্য নয়। পণ্য বদলে আবার চেষ্টা করুন।",
  duplicate: "এই অর্ডারটি ইতিমধ্যে জমা হয়েছে। আপনার অর্ডার তালিকা দেখুন।",
  "coupon-not-found": "কুপন কোডটি সঠিক নয়; অর্ডার জমা হয়নি। কুপন ছাড়া এগিয়ে যেতে পারেন বা ফিরে গিয়ে ঠিক করুন।",
  "coupon-inactive": "এই কুপনটি এখন চালু নেই; অর্ডার জমা হয়নি।",
  "coupon-not-started": "এই কুপনটি এখনো শুরু হয়নি; অর্ডার জমা হয়নি।",
  "coupon-expired": "এই কুপনের মেয়াদ শেষ হয়ে গেছে; অর্ডার জমা হয়নি।",
  "coupon-used-up": "এই কুপনের ব্যবহারের সীমা শেষ; অর্ডার জমা হয়নি।",
  "coupon-min-order": "এই কুপনের জন্য আরও বেশি মূল্যের অর্ডার প্রয়োজন; অর্ডার জমা হয়নি।",
};

const couponFailure: Record<string, string> = {
  not_found: "কুপন কোডটি সঠিক নয়",
  inactive: "কুপনটি এখন চালু নেই",
  not_started: "কুপনটি এখনো শুরু হয়নি",
  expired: "কুপনের মেয়াদ শেষ",
  used_up: "কুপনের ব্যবহারের সীমা শেষ",
  min_order: "কুপনের জন্য আরও বেশি মূল্যের অর্ডার প্রয়োজন",
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function DeliveryContent({ searchParams }: Pick<PageProps<"/checkout/delivery">, "searchParams">) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError && !isNoActiveSessionError(userError)) {
    throw new Error("Unable to verify the signed-in customer.", { cause: userError });
  }

  const [options, params, settingsResult] = await Promise.all([
    getCheckoutOptions(),
    searchParams,
    supabase.from("site_settings").select("value").eq("key", "general").maybeSingle(),
  ]);
  const generalSettings = settingsResult.data?.value && typeof settingsResult.data.value === "object"
    ? settingsResult.data.value as Record<string, unknown>
    : {};
  const shippingCharges = getShippingCharges(generalSettings.delivery_charges);
  const status = first(params.status);
  const message = status && Object.hasOwn(statusMessages, status) ? statusMessages[status] : undefined;

  // Selected products and quantities arrive in the address bar from step 1.
  const rawIds = Array.isArray(params.productId) ? params.productId : params.productId ? [params.productId] : [];
  const seen = new Set<string>();
  const wanted: { id: string; quantity: number }[] = [];
  for (const id of rawIds) {
    if (!uuid.test(id) || seen.has(id.toLowerCase()) || wanted.length >= 20) continue;
    seen.add(id.toLowerCase());
    const q = first(params[`quantity-${id}`]);
    wanted.push({ id, quantity: q && /^[1-9]\d?$/.test(q.trim()) ? Number(q) : 1 });
  }
  const catalog = new Map((options.products ?? []).map((p) => [p.id.toLowerCase(), p]));
  const lines = wanted
    .filter((w) => catalog.has(w.id.toLowerCase()))
    .map((w) => {
      const product = catalog.get(w.id.toLowerCase())!;
      return { ...w, title: product.title, product_type: product.product_type, price: Number(product.price), total: Math.round(Number(product.price) * w.quantity * 100) / 100 };
    });
  const subtotal = Math.round(lines.reduce((sum, l) => sum + l.total, 0) * 100) / 100;
  const requiresShipping = lines.some((line) => !["course", "ebook", "digital"].includes(line.product_type));
  const requestedShippingZone = first(params.shippingZone);
  const initialShippingZone = ["dhaka_city", "district_town", "remote_union"].includes(requestedShippingZone ?? "")
    ? requestedShippingZone!
    : "dhaka_city";

  const couponInput = (first(params.couponCode) ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  let appliedCode = "";
  let discount = 0;
  let couponNote = "";
  if (user && couponInput && lines.length > 0) {
    const { data, error } = await supabase.rpc("preview_coupon", { p_code: couponInput, p_subtotal: subtotal });
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row?.status === "ok") {
      appliedCode = couponInput;
      discount = Number(row.discount);
    } else {
      couponNote = `${couponFailure[row?.status as string] ?? "কুপন যাচাই করা যায়নি"} — এই অর্ডারে কুপন প্রযোজ্য হবে না।`;
    }
  }
  const back = new URLSearchParams();
  if (lines.length) {
    back.set("products", lines.map((l) => l.id).join(","));
    back.set("quantities", lines.map((l) => `${l.id}:${l.quantity}`).join(","));
  }
  if (couponInput) back.set("couponCode", couponInput);
  if (initialShippingZone) back.set("shippingZone", initialShippingZone);
  const backHref = `/checkout${back.toString() ? `?${back}` : ""}`;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link href={backHref} className="font-semibold text-emerald-700">← পণ্য ও কুপনে ফিরে যান</Link>
        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">ধাপ ২ / ২</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">ডেলিভারি ও পেমেন্ট</h1>
          <p className="mt-3 leading-7 text-slate-600">অর্ডারের মূল্য সার্ভার প্রকাশিত পণ্যের বর্তমান মূল্য থেকে নির্ধারণ করবে। সব মূল্য বাংলাদেশি টাকা (BDT)।</p>
        </header>

        {message && <p role="status" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">{message}</p>}

        {!user ? (
          <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-bold">অর্ডার করতে লগইন প্রয়োজন</h2>
            <p className="mt-2 leading-7 text-amber-950">অর্ডার আপনার অ্যাকাউন্টের সঙ্গে যুক্ত ও ব্যক্তিগত রাখতে লগইন করুন অথবা অ্যাকাউন্ট তৈরি করুন।</p>
            <Link href="/login" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white">লগইন বা অ্যাকাউন্ট তৈরি</Link>
          </section>
        ) : options.products === null || options.paymentMethods === null ? (
          <p className="mt-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 leading-7 text-amber-950">অর্ডারের জন্য প্রয়োজনীয় ডেটাবেস সেটআপ এখনো প্রস্তুত নয়। অনুগ্রহ করে পরিচালকের সঙ্গে যোগাযোগ করুন।</p>
        ) : lines.length === 0 ? (
          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">কোনো পণ্য নির্বাচন করা হয়নি</h2>
            <p className="mt-2 text-slate-600">আগে অন্তত একটি পণ্য বেছে নিন।</p>
            <Link href="/checkout" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white">পণ্য নির্বাচন করুন</Link>
          </section>
        ) : (
          <form action={placeOrder} className="mt-7 grid gap-6">
            <input type="hidden" name="idempotencyKey" value={randomUUID()} />
            {lines.map((l) => (
              <span key={l.id} hidden>
                <input type="hidden" name="productId" value={l.id} />
                <input type="hidden" name={`quantity-${l.id}`} value={l.quantity} />
              </span>
            ))}
            {appliedCode && <input type="hidden" name="couponCode" value={appliedCode} />}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold">আপনার অর্ডার</h2>
              <ul className="mt-4 divide-y divide-slate-100">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-4 py-3">
                    <span className="min-w-0"><span className="block font-semibold">{l.title}</span><span className="text-sm text-slate-500">{formatBDT(l.price)} × {l.quantity}</span></span>
                    <span className="shrink-0 font-bold">{formatBDT(l.total)}</span>
                  </li>
                ))}
              </ul>
              {couponNote && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{couponNote}</p>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold">ডেলিভারি তথ্য</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="customer-name" className="mb-2 block font-semibold">গ্রাহকের নাম *</label>
                  <input id="customer-name" name="customerName" required minLength={2} maxLength={100} autoComplete="name" placeholder="আপনার সম্পূর্ণ নাম" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </div>
                <div>
                  <label htmlFor="customer-phone" className="mb-2 block font-semibold">মোবাইল নম্বর *</label>
                  <input id="customer-phone" name="customerPhone" type="tel" required minLength={7} maxLength={25} autoComplete="tel" placeholder="01XXXXXXXXX" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-5">
                <h3 className="font-bold text-slate-900">ডেলিভারি ঠিকানা</h3>
                <p className="mt-1 text-sm text-slate-500">যে ঠিকানায় বই ও পণ্য পৌঁছে দিতে হবে</p>
                <AddressFields />
                <div className="mt-4">
                  <label htmlFor="delivery-address" className="mb-2 block text-sm font-semibold">বাড়ি / ফ্ল্যাট / রোড নম্বর ও বিস্তারিত *</label>
                  <textarea id="delivery-address" name="deliveryAddress" required minLength={5} maxLength={700} autoComplete="street-address" rows={3} placeholder="বাড়ি নম্বর, ফ্ল্যাট, রোড, ল্যান্ডমার্ক ইত্যাদি লিখুন" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </div>
                <div className="mt-4">
                  <label htmlFor="delivery-instructions" className="mb-2 block text-sm font-semibold">ডেলিভারি নির্দেশনা (ঐচ্ছিক)</label>
                  <input id="delivery-instructions" name="deliveryInstructions" maxLength={200} placeholder="যেমন: কল করে আসবেন" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </div>
              </div>
            </section>

            <ShippingChargeSelector
              subtotal={subtotal}
              discount={discount}
              required={requiresShipping}
              initialZone={initialShippingZone}
              charges={shippingCharges}
            />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold">পেমেন্ট মেথড</h2>
              {options.paymentMethods.length === 0 ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">এখনো কোনো পেমেন্ট পদ্ধতি চালু নেই। পদ্ধতি চালু হলে এখানে অর্ডার করতে পারবেন।</p>
              ) : (
                <fieldset className="mt-4 grid gap-3">
                  <legend className="sr-only">একটি পেমেন্ট মেথড নির্বাচন করুন</legend>
                  {options.paymentMethods.map((method, index) => (
                    <label key={method.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-300">
                      <input type="radio" name="paymentMethodId" value={method.id} required={index === 0} className="mt-1 size-4 shrink-0 text-emerald-700" />
                      <span>
                        <span className="block font-bold">{method.name}{" "}{method.method_type === "cod" && <span className="text-sm font-medium text-slate-600">(COD)</span>}</span>
                        {method.description && <span className="mt-1 block text-sm leading-6 text-slate-600">{method.description}</span>}
                        {method.instructions && <span className="mt-1 block whitespace-pre-wrap text-sm leading-6 text-slate-600">{method.instructions}</span>}
                        {method.method_type === "manual" && <span className="mt-2 block text-xs leading-5 text-amber-800">পেমেন্ট যাচাই না হওয়া পর্যন্ত অর্ডার Paid হবে না।</span>}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
            </section>

            {options.paymentMethods.length > 0 ? (
              <SubmitButton pendingLabel="অর্ডার জমা হচ্ছে…" className="min-h-12 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800">অর্ডার জমা দিন</SubmitButton>
            ) : (
              <button type="button" disabled className="min-h-12 cursor-not-allowed rounded-xl bg-slate-300 px-5 py-3 font-bold text-slate-600">পেমেন্ট পদ্ধতি চালু হলে অর্ডার করতে পারবেন</button>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

export default function DeliveryPage({ searchParams }: PageProps<"/checkout/delivery">) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-4xl animate-pulse rounded-2xl bg-white p-8"><div className="h-8 w-64 rounded bg-slate-100" /><div className="mt-8 h-64 rounded-xl bg-slate-100" /></div></main>}>
      <DeliveryContent searchParams={searchParams} />
    </Suspense>
  );
}
