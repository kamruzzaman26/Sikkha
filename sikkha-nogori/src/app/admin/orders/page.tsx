import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { formatBDT } from "@/lib/money";
import { canTransitionOrder } from "@/lib/order-workflow.mjs";
import { requireAdmin } from "@/lib/supabase/admin";
import {
  recordOrderRefund,
  reviewOrderPayment,
  updateOrderStatus,
} from "./actions";

export const metadata: Metadata = {
  title: "অর্ডার পরিচালনা | শিক্ষা নগরী",
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
  rejected: "পেমেন্ট রেফারেন্স প্রত্যাখ্যাত",
  failed: "পেমেন্ট ব্যর্থ",
  cancelled: "পেমেন্ট বাতিল",
  refunded: "পেমেন্ট ফেরত দেওয়া হয়েছে",
} as const;

const statusMessages = {
  "order-updated": "অর্ডারের অবস্থা হালনাগাদ হয়েছে।",
  "payment-verified": "পেমেন্ট যাচাই করে Paid চিহ্নিত হয়েছে।",
  "payment-rejected": "পেমেন্ট reference প্রত্যাখ্যান করা হয়েছে।",
  "refund-recorded": "রিফান্ড রেকর্ড হয়েছে; entitlement প্রত্যাহার করা হয়েছে।",
  invalid: "তথ্য যাচাই করুন।",
  forbidden: "এই কাজের জন্য Admin অনুমতি প্রয়োজন।",
  "not-found": "অর্ডারটি পাওয়া যায়নি।",
  "invalid-transition": "এই অর্ডারের বর্তমান অবস্থায় পরিবর্তনটি অনুমোদিত নয়।",
} as const;

type AdminOrder = {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  currency: string;
  total_amount: number | string;
  payment_method_id: string;
  payment_method_name: string;
  payment_method_type: "manual" | "cod";
  payment_instructions: string;
  status: keyof typeof orderStatusLabels;
  payment_status: keyof typeof paymentStatusLabels;
  created_at: string;
};

async function AdminOrdersContent({
  searchParams,
}: Pick<PageProps<"/admin/orders">, "searchParams">) {
  await connection();
  const { supabase, role } = await requireAdmin("admin");
  if (role !== "admin") {
    notFound();
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, user_id, customer_name, customer_phone, delivery_address, currency, total_amount, payment_method_id, payment_method_name, payment_method_type, payment_instructions, status, payment_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (ordersError) {
    throw new Error("Unable to load orders.", { cause: ordersError });
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
            "id, order_id, transaction_reference, status, submitted_at, rejection_reason",
          )
          .in("order_id", orderIds)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    searchParams,
  ]);

  if (itemsResult.error) {
    throw new Error("Unable to load order items.", {
      cause: itemsResult.error,
    });
  }
  if (submissionsResult.error) {
    throw new Error("Unable to load payment submissions.", {
      cause: submissionsResult.error,
    });
  }

  const statusValue = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const message =
    statusValue && Object.hasOwn(statusMessages, statusValue)
      ? statusMessages[statusValue as keyof typeof statusMessages]
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
  const typedOrders = orders as AdminOrder[];

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin" className="font-semibold text-emerald-700">
            ← প্রশাসনিক প্যানেল
          </Link>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              লগআউট
            </button>
          </form>
        </div>

        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">
            শিক্ষা নগরী · প্রশাসন
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            অর্ডার পরিচালনা
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            সর্বশেষ ১০০টি অর্ডার দেখুন। ম্যানুয়াল পেমেন্ট যাচাই ছাড়া Paid হয়
            না; COD-তে ডেলিভারি সম্পন্ন ও নগদ গ্রহণের পর যাচাই করুন।
          </p>
        </header>

        {message && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950"
          >
            {message}
          </p>
        )}

        {typedOrders.length === 0 ? (
          <p className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-slate-600">
            এখনো কোনো অর্ডার নেই।
          </p>
        ) : (
          <ul className="mt-7 grid gap-5">
            {typedOrders.map((order) => {
              const latestSubmission = latestSubmissionByOrder.get(order.id);
              const nextStatuses = (
                ["confirmed", "processing", "shipped", "delivered", "cancelled"] as const
              ).filter((nextStatus) =>
                canTransitionOrder({
                  currentStatus: order.status,
                  nextStatus,
                  paymentMethodType: order.payment_method_type,
                  paymentStatus: order.payment_status,
                }),
              );
              const canReviewManualPayment =
                order.payment_method_type === "manual" &&
                order.payment_status === "submitted" &&
                latestSubmission?.status === "submitted";
              const canVerifyCodPayment =
                order.payment_method_type === "cod" &&
                order.payment_status === "awaiting" &&
                order.status === "delivered";
                          const canRecordRefund = order.payment_status === "verified";

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
                      <p className="mt-1 break-all text-xs text-slate-500">
                        Customer ID: {order.user_id}
                      </p>
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
                            : order.payment_status === "refunded"
                              ? "bg-rose-100 text-rose-800"
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
                          {item.product_title} × {item.quantity} ·{" "}
                          {formatBDT(item.unit_price)}
                        </span>
                        <span className="font-semibold">
                          {formatBDT(item.line_total)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-slate-600">গ্রাহক</dt>
                      <dd className="mt-1">
                        {order.customer_name} · {order.customer_phone}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-600">
                        পেমেন্ট মেথড
                      </dt>
                      <dd className="mt-1">{order.payment_method_name}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-600">
                        ডেলিভারি ঠিকানা
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap">
                        {order.delivery_address}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-600">সর্বমোট</dt>
                      <dd className="mt-1 text-lg font-extrabold text-emerald-800">
                        {formatBDT(order.total_amount)}{" "}
                        <span className="text-sm">({order.currency})</span>
                      </dd>
                    </div>
                  </dl>

                  {latestSubmission && (
                    <p className="mt-4 break-all rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      Transaction reference:{" "}
                      <span className="font-semibold">
                        {latestSubmission.transaction_reference}
                      </span>
                      {latestSubmission.rejection_reason && (
                        <span className="mt-1 block text-amber-900">
                          প্রত্যাখ্যানের কারণ: {latestSubmission.rejection_reason}
                        </span>
                      )}
                    </p>
                  )}

                  {canRecordRefund && (
                    <form
                      action={recordOrderRefund}
                      className="mt-5 grid gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <input type="hidden" name="orderId" value={order.id} />
                      <label className="sr-only" htmlFor={`refund-${order.id}`}>
                        রিফান্ডের কারণ ও সম্পন্ন হওয়ার বিবরণ
                      </label>
                      <input
                        id={`refund-${order.id}`}
                        name="reason"
                        required
                        minLength={3}
                        maxLength={500}
                        placeholder="পেমেন্ট ফেরত সম্পন্ন হওয়ার বিবরণ"
                        className="w-full rounded-lg border border-rose-300 px-3 py-2"
                      />
                      <button
                        type="submit"
                        className="min-h-10 rounded-lg border border-rose-700 px-4 py-2 font-bold text-rose-900 hover:bg-rose-100"
                      >
                        সম্পন্ন রিফান্ড রেকর্ড
                      </button>
                      <p className="text-sm leading-6 text-rose-900 sm:col-span-2">
                        বাইরের payment provider/ব্যাংকে ফেরত সম্পন্ন হওয়ার পরই
                        রেকর্ড করুন; এই সিস্টেম টাকা পাঠায় না।
                      </p>
                    </form>
                  )}

                  {(canReviewManualPayment || canVerifyCodPayment) && (
                    <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h3 className="font-bold text-amber-950">
                        {canVerifyCodPayment
                          ? "COD পেমেন্ট যাচাই"
                          : "ম্যানুয়াল পেমেন্ট যাচাই"}
                      </h3>
                      {canVerifyCodPayment && (
                        <p className="mt-1 text-sm leading-6 text-amber-950">
                          গ্রাহকের কাছ থেকে নগদ গ্রহণ নিশ্চিত না হলে যাচাই করবেন না।
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-3">
                        <form action={reviewOrderPayment}>
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />
                          <input
                            type="hidden"
                            name="decision"
                            value="verified"
                          />
                          <button
                            type="submit"
                            className="min-h-10 rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800"
                          >
                            পেমেন্ট যাচাই ও Paid করুন
                          </button>
                        </form>
                        {canReviewManualPayment && (
                          <form
                            action={reviewOrderPayment}
                            className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                          >
                            <input
                              type="hidden"
                              name="orderId"
                              value={order.id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="rejected"
                            />
                            <label className="sr-only" htmlFor={`reject-${order.id}`}>
                              পেমেন্ট প্রত্যাখ্যানের কারণ
                            </label>
                            <input
                              id={`reject-${order.id}`}
                              name="rejectionReason"
                              required
                              maxLength={500}
                              placeholder="প্রত্যাখ্যানের কারণ"
                              className="w-full rounded-lg border border-amber-300 px-3 py-2"
                            />
                            <button
                              type="submit"
                              className="min-h-10 rounded-lg border border-amber-700 px-4 py-2 font-bold text-amber-900 hover:bg-amber-100"
                            >
                              Reference প্রত্যাখ্যান
                            </button>
                          </form>
                        )}
                      </div>
                    </section>
                  )}

                  {nextStatuses.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      {nextStatuses.map((nextStatus) => (
                        <form action={updateOrderStatus} key={nextStatus}>
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />
                          <input
                            type="hidden"
                            name="nextStatus"
                            value={nextStatus}
                          />
                          <button
                            type="submit"
                            className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold ${
                              nextStatus === "cancelled"
                                ? "border-rose-300 text-rose-800 hover:bg-rose-50"
                                : "border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {orderStatusLabels[nextStatus]}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

export default function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-5xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <AdminOrdersContent searchParams={searchParams} />
    </Suspense>
  );
}
