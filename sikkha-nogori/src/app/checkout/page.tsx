import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatBDT } from "@/lib/money";
import { getCheckoutOptions } from "@/lib/supabase/checkout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isNoActiveSessionError } from "@/lib/supabase/auth-errors";
import { SubmitButton } from "@/components/submit-button";
import { CouponField } from "@/components/coupon-field";

export const metadata: Metadata = {
  title: "অর্ডার | শিক্ষা নগরী",
  description: "প্রকাশিত পণ্য বেছে নিয়ে নিরাপদে অর্ডার জমা দিন।",
  robots: { index: false, follow: false },
};

const statusMessages = {
  invalid: "তথ্য যাচাই করুন, পণ্য নির্বাচন এবং সব প্রয়োজনীয় ঘর পূরণ করুন।",
  unavailable:
    "নির্বাচিত পণ্য বা পেমেন্ট মেথড এখন উপলভ্য নয়। আবার পৃষ্ঠা লোড করে চেষ্টা করুন।",
  "coupon-not-found": "কুপন কোডটি সঠিক নয়। কোড দেখে আবার লিখুন; অর্ডার জমা হয়নি।",
  "coupon-inactive": "এই কুপনটি এখন চালু নেই; অর্ডার জমা হয়নি।",
  "coupon-not-started": "এই কুপনটি এখনো শুরু হয়নি; অর্ডার জমা হয়নি।",
  "coupon-expired": "এই কুপনের মেয়াদ শেষ হয়ে গেছে; অর্ডার জমা হয়নি।",
  "coupon-used-up": "এই কুপনের ব্যবহারের সীমা শেষ; অর্ডার জমা হয়নি।",
  "coupon-min-order": "এই কুপনের জন্য আরও বেশি মূল্যের অর্ডার প্রয়োজন; অর্ডার জমা হয়নি।",
  duplicate: "এই অর্ডারটি ইতিমধ্যে জমা হয়েছে। আপনার অর্ডার তালিকা দেখুন।",
} as const;

function getSelectedProductId(value: string | string[] | undefined): string | null {
  const productId = Array.isArray(value) ? value[0] : value;
  return productId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      productId,
    )
    ? productId
    : null;
}

async function CheckoutContent({
  searchParams,
}: Pick<PageProps<"/checkout">, "searchParams">) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && !isNoActiveSessionError(userError)) {
    throw new Error("Unable to verify the signed-in customer.", {
      cause: userError,
    });
  }

  const [options, params] = await Promise.all([
    getCheckoutOptions(),
    searchParams,
  ]);
  const { data: couponRows } = user ? await supabase.rpc("get_public_coupons") : { data: null };
  const publicCoupons = (couponRows ?? []) as { code: string; description: string; discount_percent: number; expires_at: string | null; min_order_amount: number }[];
  const initialCoupon = (Array.isArray(params.couponCode) ? params.couponCode[0] : params.couponCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message =
    status && Object.hasOwn(statusMessages, status)
      ? statusMessages[status as keyof typeof statusMessages]
      : undefined;
  const selectedProductId = getSelectedProductId(params.product);
  const selectedProductIds = new Set((Array.isArray(params.products) ? params.products[0] : params.products ?? "").split(",").filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)));
  const selectedQuantities = new Map((Array.isArray(params.quantities) ? params.quantities[0] : params.quantities ?? "").split(",").map((entry) => { const [id, quantity] = entry.split(":"); return [id, /^[1-9]\d?$/.test(quantity ?? "") ? Number(quantity) : 1] as const; }));

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="font-semibold text-emerald-700">
          ← শিক্ষা নগরী
        </Link>
        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">ধাপ ১ / ২</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            পণ্য ও কুপন
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            অর্ডারের মূল্য সার্ভার প্রকাশিত পণ্যের বর্তমান মূল্য থেকে হিসাব
            করবে। সব মূল্য বাংলাদেশি টাকা (BDT)।
          </p>
        </header>

        {message && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
          >
            {message}
          </p>
        )}

        {!user ? (
          <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-bold">অর্ডার করতে লগইন প্রয়োজন</h2>
            <p className="mt-2 leading-7 text-amber-950">
              অর্ডার আপনার অ্যাকাউন্টের সঙ্গে যুক্ত ও ব্যক্তিগত রাখতে আগে লগইন
              করুন অথবা অ্যাকাউন্ট তৈরি করুন।
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white"
            >
              লগইন বা অ্যাকাউন্ট তৈরি
            </Link>
          </section>
        ) : options.products === null || options.paymentMethods === null ? (
          <p className="mt-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 leading-7 text-amber-950">
            অর্ডারের জন্য প্রয়োজনীয় ডেটাবেস সেটআপ এখনো প্রস্তুত নয়। সাইট
            পরিচালকের সঙ্গে যোগাযোগ করুন।
          </p>
        ) : options.products.length === 0 ? (
          <p className="mt-7 rounded-xl border border-slate-200 bg-white px-4 py-5 leading-7 text-slate-600">
            অর্ডারের জন্য কোনো প্রকাশিত পণ্য এখন উপলভ্য নেই।
          </p>
        ) : (
          <form action="/checkout/delivery" method="get" className="mt-7 grid gap-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold">পণ্য নির্বাচন</h2>
              <ul className="mt-4 grid gap-3">
                {options.products.map((product) => (
                  <li
                    key={product.id}
                    className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[minmax(0,1fr)_7rem]"
                  >
                    <label className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        name="productId"
                        value={product.id}
                        defaultChecked={selectedProductIds.has(product.id) || product.id === selectedProductId}
                        className="mt-1 size-4 shrink-0 rounded border-slate-300 text-emerald-700"
                      />
                      <span className="min-w-0">
                        <span className="block font-bold">{product.title}</span>
                        <span className="mt-1 block text-sm text-slate-600">
                          {product.product_type === "course" ? "কোর্স" : "বই"} ·{" "}
                          {formatBDT(product.price)}
                        </span>
                        {product.description && (
                          <span className="mt-1 block text-sm leading-6 text-slate-500">
                            {product.description}
                          </span>
                        )}
                      </span>
                    </label>
                    <div>
                      <label
                        htmlFor={`quantity-${product.id}`}
                        className="mb-1 block text-xs font-semibold text-slate-600"
                      >
                        পরিমাণ
                      </label>
                      <input
                        id={`quantity-${product.id}`}
                        name={`quantity-${product.id}`}
                        type="number"
                        min={1}
                        max={99}
                        step={1}
                        defaultValue={selectedQuantities.get(product.id) ?? 1}
                        required={false}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <CouponField
              initialCode={initialCoupon}
              coupons={publicCoupons.map((c) => ({
                code: c.code,
                percent: Number(c.discount_percent),
                description: c.description,
                expiresAt: c.expires_at,
                minOrder: Number(c.min_order_amount),
              }))}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/books" className="font-semibold text-emerald-800 hover:underline">← আরও বই দেখুন</Link>
              <SubmitButton
                pendingLabel="পরের ধাপে যাচ্ছে…"
                className="min-h-12 rounded-xl bg-emerald-700 px-7 py-3 font-bold text-white hover:bg-emerald-800"
              >
                পরের ধাপ: ডেলিভারি ও পেমেন্ট →
              </SubmitButton>
            </div>
          </form>
        )}

        <nav className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-emerald-800">
          <Link href="/account/orders" className="hover:underline">
            আমার অর্ডার
          </Link>
          <Link href="/books" className="hover:underline">
            বইয়ের সংগ্রহ
          </Link>
        </nav>
      </div>
    </main>
  );
}

export default function CheckoutPage({
  searchParams,
}: PageProps<"/checkout">) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-4xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-64 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <CheckoutContent searchParams={searchParams} />
    </Suspense>
  );
}
