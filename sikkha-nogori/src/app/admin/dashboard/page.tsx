import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatBDT } from "@/lib/money";
import { bestSellers, summarizeOrders } from "@/lib/admin-stats.mjs";
import { requireAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Dashboard | শিক্ষা নগরী প্রশাসন",
  robots: { index: false, follow: false },
};

const orderStatusLabels: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  confirmed: "নিশ্চিত",
  processing: "প্রস্তুত হচ্ছে",
  shipped: "পাঠানো হয়েছে",
  delivered: "ডেলিভারি সম্পন্ন",
  cancelled: "বাতিল",
};

function Card({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function Unavailable({ what }: { what: string }) {
  return (
    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
      {what} লোড করা যায়নি। ডেটাবেস অনুমতি বা সংযোগ যাচাই করুন।
    </p>
  );
}

async function DashboardContent() {
  await connection();
  const { supabase } = await requireAdmin("admin");

  const [productsResult, ordersResult, usersResult] = await Promise.all([
    supabase.from("products").select("id, is_published, archived_at"),
    supabase
      .from("orders")
      .select(
        "id, customer_name, total_amount, status, payment_status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.rpc("admin_list_users"),
  ]);

  const orders = ordersResult.data ?? [];
  const orderStats = summarizeOrders(orders);
  const productRows = productsResult.data ?? [];
  const recent = orders.slice(0, 5);

  const activeIds = orders
    .filter((order) => order.status !== "cancelled")
    .map((order) => order.id);
  const itemsResult =
    activeIds.length > 0
      ? await supabase
          .from("order_items")
          .select("product_title, quantity")
          .in("order_id", activeIds.slice(0, 200))
          .limit(2000)
      : { data: [], error: null };
  const top = bestSellers(itemsResult.data ?? []);

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold text-emerald-700">শিক্ষা নগরী · প্রশাসন</p>
        <h1 className="mt-1 text-3xl font-extrabold">Dashboard</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          সব সংখ্যা সরাসরি ডেটাবেস থেকে। বিক্রি গণনায় শুধু পেমেন্ট যাচাই হওয়া
          অর্ডার ধরা হয় (ঢাকার সময় অনুযায়ী আজ/মাস)।
        </p>

        <h2 className="mt-8 text-lg font-bold">Sales / বিক্রি</h2>
        {ordersResult.error ? (
          <div className="mt-3">
            <Unavailable what="অর্ডারের তথ্য" />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Total Sales" value={formatBDT(orderStats.totalSales)} />
            <Card label="Today's Sales" value={formatBDT(orderStats.todaySales)} />
            <Card label="Monthly Sales" value={formatBDT(orderStats.monthSales)} />
            <Card label="Total Orders" value={String(orderStats.totalOrders)} />
            <Card label="Pending Orders" value={String(orderStats.pending)} />
            <Card label="Completed Orders" value={String(orderStats.completed)} />
            <Card label="Cancelled Orders" value={String(orderStats.cancelled)} />
          </div>
        )}

        <h2 className="mt-8 text-lg font-bold">Catalog ও Customers</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {productsResult.error ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <Unavailable what="পণ্যের তথ্য" />
            </div>
          ) : (
            <>
              <Card label="Total Products" value={String(productRows.length)} />
              <Card
                label="Published"
                value={String(
                  productRows.filter((p) => p.is_published && !p.archived_at)
                    .length,
                )}
              />
            </>
          )}
          {usersResult.error ? (
            <div className="sm:col-span-2">
              <Unavailable what="ব্যবহারকারীর তথ্য" />
            </div>
          ) : (
            <Card
              label="Total Users"
              value={String((usersResult.data ?? []).length)}
              note="অ্যাডমিনসহ সব নিবন্ধিত অ্যাকাউন্ট"
            />
          )}
        </div>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          Low Stock / Out of Stock: <strong>এখনো প্রযোজ্য নয়</strong> — স্টক
          ট্র্যাকিং (Inventory) ডেটাবেসে এখনো যোগ হয়নি, তাই কোনো সংখ্যা
          দেখানো হচ্ছে না।
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-bold">Recent Orders</h2>
            {recent.length === 0 ? (
              <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
                এখনো কোনো অর্ডার নেই।
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {recent.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-semibold">
                      {order.customer_name}
                    </span>
                    <span className="shrink-0 text-slate-600">
                      {orderStatusLabels[order.status] ?? order.status} ·{" "}
                      {formatBDT(order.total_amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/orders"
              className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline"
            >
              সব অর্ডার দেখুন
            </Link>
          </section>

          <section>
            <h2 className="text-lg font-bold">Best Selling Products</h2>
            {itemsResult.error ? (
              <div className="mt-3">
                <Unavailable what="বিক্রির তথ্য" />
              </div>
            ) : top.length === 0 ? (
              <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
                এখনো বিক্রির তথ্য নেই।
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {top.map((item) => (
                  <li
                    key={item.title}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-semibold">
                      {item.title}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {item.quantity} কপি
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <p className="mt-8 text-xs leading-5 text-slate-500">
          Sales Analytics চার্ট, Revenue Report ও Date-range রিপোর্ট পরবর্তী
          ফেজে (Reports) যুক্ত হবে — এখনো তৈরি হয়নি।
        </p>
      </div>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-8">
          <div className="mx-auto h-64 max-w-6xl animate-pulse rounded-2xl bg-white" />
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
