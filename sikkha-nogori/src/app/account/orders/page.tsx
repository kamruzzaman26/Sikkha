import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOutCustomer } from "@/app/login/actions";
import { formatBDT } from "@/lib/money";
import { submitManualPayment } from "./actions";
import { requireCustomer } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "আমার অর্ডার | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const orderStatusLabels = {
  pending: "অপেক্ষমাণ",
  confirmed: "নিশ্চিত",
  processing: "প্রস্তুত হচ্ছে",
  shipped: "পাঠানো হয়েছে",
  delivered: "ডেলিভারি সম্পন্ন",
  cancelled: "বাতিল",
} as const;

const paymentStatusLabels = {
  awaiting: "পেমেন্টের অপেক্ষায়",
  submitted: "যাচাইয়ের অপেক্ষায়",
  verified: "পেমেন্ট যাচাই হয়েছে",
  rejected: "পেমেন্ট রেফারেন্স গ্রহণ করা যায়নি",
  failed: "পেমেন্ট ব্যর্থ",
  cancelled: "পেমেন্ট বাতিল",
  refunded: "পেমেন্ট ফেরত দেওয়া হয়েছে",
} as const;

const messages = {
  created: "আপনার অর্ডার জমা হয়েছে।",
  "invalid-reference": "লেনদেনের reference সঠিকভাবে লিখুন।",
  "payment-unavailable": "এই অর্ডারে payment reference জমা দেওয়া যাচ্ছে না।",
  "duplicate-reference":
    "এই transaction reference আগে জমা হয়েছে। reference যাচাই করে নতুন করে দিন।",
  "reference-submitted":
    "লেনদেনের reference জমা হয়েছে; যাচাই না হওয়া পর্যন্ত পেমেন্ট Paid নয়।",
} as const;

type CustomerOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  currency: string;
  total_amount: number | string;
  payment_method_name: string;
  payment_method_type: "manual" | "cod";
  payment_instructions: string;
  status: keyof typeof orderStatusLabels;
  payment_status: keyof typeof paymentStatusLabels;
  payment_refund_reason: string | null;
  created_at: string;
};

async function AccountOrdersContent({
  searchParams,
}: Pick<PageProps<"/account/orders">, "searchParams">) {
  const { supabase, user } = await requireCustomer();

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, delivery_address, currency, total_amount, payment_method_name, payment_method_type, payment_instructions, status, payment_status, payment_refund_reason, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (ordersError) {
    throw new Error("Unable to load your orders.", { cause: ordersError });
  }

  const orderIds = orders.map(({ id }) => id);
  const [itemsResult, submissionsResult, params] = await Promise.all([
    orderIds.length > 0
      ? supabase
          .from("order_items")
          .select("id, order_id, product_title, unit_price, quantity, line_total")
          .in("order_id", orderIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    orderIds.length > 0
      ? supabase
          .from("order_payment_submissions")
          .select(
            "id, order_id, transaction_reference, status, submitted_at, reviewed_at, rejection_reason",
          )
          .in("order_id", orderIds)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    searchParams,
  ]);

  if (itemsResult.error) {
    throw new Error("Unable to load your order items.", {
      cause: itemsResult.error,
    });
  }
  if (submissionsResult.error) {
    throw new Error("Unable to load your payment references.", {
      cause: submissionsResult.error,
    });
  }

  const statusValue = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const message =
    statusValue && Object.hasOwn(messages, statusValue)
      ? messages[statusValue as keyof typeof messages]
      : undefined;
  const itemsByOrder = new Map<string, typeof itemsResult.data>();
  for (const item of itemsResult.data) {
    const items = itemsByOrder.get(item.order_id) ?? [];
    items.push(item);
    itemsByOrder.set(item.order_id, items);
  }
  const latestSubmissionByOrder = new Map<
    string,
    (typeof submissionsResult.data)[number]
  >();
  for (const submission of submissionsResult.data) {
    if (!latestSubmissionByOrder.has(submission.order_id)) {
      latestSubmissionByOrder.set(submission.order_id, submission);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-emerald-700">
            ← শিক্ষা নগরী
          </Link>
          <form action={signOutCustomer}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              লগআউট
            </button>
          </form>
        </div>
        <header className="mt-8">
          <h1 className="text-3xl font-extrabold sm:text-4xl">আমার অর্ডার</h1>
          <p className="mt-2 break-all text-sm text-slate-600">{user.email}</p>
        </header>

        {message && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950"
          >
            {message}
          </p>
        )}

        {orders.length === 0 ? (
          <p className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-slate-600">
            আপনার এখনো কোনো অর্ডার নেই।
          </p>
        ) : (
          <ul className="mt-7 grid gap-5">
            {(orders as CustomerOrder[]).map((order) => {
              const latestSubmission = latestSubmissionByOrder.get(order.id);
              const canSubmitReference =
                order.payment_method_type === "manual" &&
                ["awaiting", "rejected"].includes(order.payment_status) &&
                !["cancelled", "delivered"].includes(order.status);

              return (
                <li
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">
                        অর্ডার · {order.id.slice(0, 8).toUpperCase()}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(order.created_at).toLocaleString("bn-BD")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-800">
                        {orderStatusLabels[order.status]}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          order.payment_status === "verified"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-50 text-amber-900"
                        }`}
                      >
                        {paymentStatusLabels[order.payment_status]}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                    {(itemsByOrder.get(order.id) ?? []).map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                      >
                        <span>
                          {item.product_title} × {item.quantity}
                        </span>
                        <span className="font-semibold">
                          {formatBDT(item.line_total)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-slate-600">সর্বমোট</dt>
                      <dd className="mt-1 text-lg font-extrabold text-emerald-800">
                        {formatBDT(order.total_amount)}{" "}
                        <span className="text-sm">({order.currency})</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-600">
                        পেমেন্ট মেথড
                      </dt>
                      <dd className="mt-1">{order.payment_method_name}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-600">ফোন</dt>
                      <dd className="mt-1">{order.customer_phone}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-600">
                        ডেলিভারি ঠিকানা
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap">
                        {order.delivery_address}
                      </dd>
                    </div>
                  </dl>

                  {order.payment_instructions && (
                    <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      {order.payment_instructions}
                    </p>
                  )}

                  {order.payment_status === "refunded" &&
                    order.payment_refund_reason && (
                      <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-900">
                        রিফান্ডের বিবরণ: {order.payment_refund_reason}
                      </p>
                    )}

                  {latestSubmission && (
                    <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      Transaction reference:{" "}
                      <span className="font-semibold">
                        {latestSubmission.transaction_reference}
                      </span>
                      {latestSubmission.status === "rejected" && (
                        <span className="mt-1 block text-amber-900">
                          {latestSubmission.rejection_reason ??
                            "রেফারেন্স যাচাই করা যায়নি।"}
                        </span>
                      )}
                      {latestSubmission.status === "submitted" && (
                        <span className="mt-1 block">
                          রেফারেন্স যাচাইয়ের অপেক্ষায়। এটি এখনো Paid নয়।
                        </span>
                      )}
                    </p>
                  )}

                  {canSubmitReference && (
                    <form
                      action={submitManualPayment}
                      className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <input type="hidden" name="orderId" value={order.id} />
                      <div>
                        <label
                          htmlFor={`reference-${order.id}`}
                          className="mb-2 block text-sm font-semibold"
                        >
                          লেনদেনের Transaction reference
                        </label>
                        <input
                          id={`reference-${order.id}`}
                          name="transactionReference"
                          required
                          minLength={3}
                          maxLength={100}
                          pattern="[A-Za-z0-9][A-Za-z0-9._/-]{1,99}"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <button
                        type="submit"
                        className="min-h-11 self-end rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800"
                      >
                        Reference জমা দিন
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/checkout"
          className="mt-7 inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          নতুন অর্ডার
        </Link>
      </div>
    </main>
  );
}

export default function AccountOrdersPage({
  searchParams,
}: PageProps<"/account/orders">) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-4xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <AccountOrdersContent searchParams={searchParams} />
    </Suspense>
  );
}
