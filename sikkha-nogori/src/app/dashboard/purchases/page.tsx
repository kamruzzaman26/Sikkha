import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireCustomer } from "@/lib/supabase/auth";
import { formatBDT } from "@/lib/money";

export const metadata: Metadata = {
  title: "আমার কেনা পণ্য | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

async function PurchasesContent() {
  const { supabase, user } = await requireCustomer();
  const [
    { data: entitlements, error },
    { data: orders, error: ordersError },
  ] = await Promise.all([
    supabase
    .from("product_entitlements")
    .select("id, product_id, order_id, granted_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("granted_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, status, payment_status, total_amount, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (error) {
    throw new Error("Unable to load your purchased products.", { cause: error });
  }
  if (ordersError) {
    throw new Error("Unable to load your purchase history.", {
      cause: ordersError,
    });
  }

  const productIds = entitlements.map((entitlement) => entitlement.product_id);
  const orderIds = orders.map((order) => order.id);
  const [
    { data: resources, error: resourcesError },
    { data: items, error: itemsError },
  ] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from("product_resources")
          .select("product_id")
          .in("product_id", productIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length > 0
      ? supabase
          .from("order_items")
          .select("order_id, product_title, quantity")
          .in("order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (resourcesError) {
    throw new Error("Unable to check your product access.", {
      cause: resourcesError,
    });
  }
  if (itemsError) {
    throw new Error("Unable to load your purchased items.", {
      cause: itemsError,
    });
  }
  const availableResources = new Set(
    resources.map((resource) => resource.product_id),
  );
  const { data: products, error: productsError } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select("id, title")
          .in("id", productIds)
      : { data: [], error: null };
  if (productsError) {
    throw new Error("Unable to load your product names.", {
      cause: productsError,
    });
  }
  const productTitles = new Map(
    products.map((product) => [product.id, product.title]),
  );

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="font-semibold text-emerald-700">
          ← ড্যাশবোর্ড
        </Link>
        <h1 className="mt-8 text-3xl font-extrabold">আমার কেনা পণ্য</h1>
        <p className="mt-2 leading-7 text-slate-600">
          আপনার নিজস্ব অর্ডার ও পেমেন্টের অবস্থা; ডিজিটাল কনটেন্টে প্রবেশাধিকার
          শুধু যাচাইকৃত পেমেন্টে সক্রিয় হয়।
        </p>
        <section className="mt-6">
          <h2 className="text-xl font-bold">অর্ডার ইতিহাস</h2>
          {orders.length === 0 ? (
            <p className="mt-3 rounded-xl bg-white p-4 text-slate-600">
              এখনো কোনো অর্ডার নেই।
            </p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-bold">
                      অর্ডার · {order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-600">
                      {order.payment_status === "verified"
                        ? "পেমেন্ট যাচাইকৃত"
                        : order.payment_status === "refunded"
                          ? "পেমেন্ট ফেরত"
                          : order.payment_status === "rejected" ||
                              order.payment_status === "failed"
                            ? "পেমেন্ট ব্যর্থ/প্রত্যাখ্যাত"
                            : order.payment_status === "cancelled" ||
                                order.status === "cancelled"
                              ? "বাতিল"
                              : "পেমেন্ট অপেক্ষমাণ"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {new Date(order.created_at).toLocaleDateString("bn-BD")} ·{" "}
                    {formatBDT(order.total_amount)}
                  </p>
                  <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
                    {items
                      .filter((item) => item.order_id === order.id)
                      .map((item, index) => (
                        <li key={`${order.id}-${index}`}>
                          {item.product_title} × {item.quantity}
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
        <h2 className="mt-8 text-xl font-bold">সক্রিয় ডিজিটাল অ্যাক্সেস</h2>
        {entitlements.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-slate-600">
            আপনার কোনো সক্রিয় ডিজিটাল অ্যাক্সেস নেই।
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {entitlements.map((entitlement) => {
              return (
                <li
                  key={entitlement.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <h2 className="font-bold">
                      {productTitles.get(entitlement.product_id) ?? "ডিজিটাল পণ্য"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      কেনা হয়েছে{" "}
                      {new Date(entitlement.granted_at).toLocaleDateString(
                        "bn-BD",
                      )}
                    </p>
                  </div>
                  {availableResources.has(entitlement.product_id) ? (
                    <Link
                      href={`/api/products/${entitlement.product_id}/access`}
                      className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800"
                    >
                      পণ্য খুলুন
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-600">
                      কনটেন্ট প্রস্তুত হলে এখানে পাওয়া যাবে।
                    </span>
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

export default function PurchasesPage() {
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
      <PurchasesContent />
    </Suspense>
  );
}
