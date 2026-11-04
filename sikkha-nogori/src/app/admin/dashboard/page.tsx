import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatBDT } from "@/lib/money";
import { bestSellers, summarizeOrders } from "@/lib/admin-stats.mjs";
import { requireAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Dashboard | Sikkha Nogori Admin",
  robots: { index: false, follow: false },
};

const orderStatusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)]">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function Unavailable({ what }: { what: string }) {
  return (
    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
      Unable to load {what}. Check database permissions or connectivity.
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
    <main className="min-h-screen bg-[#f3f7f5] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">SIKKHA NOGORI · ADMINISTRATION</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Dashboard Overview</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          All metrics are retrieved directly from the database. Sales include only payment-verified
          orders (today / month based on Dhaka time).
        </p>

        <h2 className="mt-8 text-lg font-bold">Sales Overview</h2>
        {ordersResult.error ? (
          <div className="mt-3">
            <Unavailable what="order data" />
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

        <h2 className="mt-8 text-lg font-bold">Catalog & Customers</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {productsResult.error ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <Unavailable what="product data" />
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
              <Unavailable what="user data" />
            </div>
          ) : (
            <Card
              label="Total Users"
              value={String((usersResult.data ?? []).length)}
              note="All registered accounts, including administrators"
            />
          )}
        </div>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          Low Stock / Out of Stock: <strong>Not available yet</strong> — স্টক
          ট্র্যাকিং (Inventory) ডেটাবেসে এখনো যোগ হয়নি, তাই কোনো সংখ্যা
          are displayed.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-bold">Recent Orders</h2>
            {recent.length === 0 ? (
              <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
                No orders yet.
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
              View all orders
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
                No sales data yet.
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
                      {item.quantity} units
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <p className="mt-8 text-xs leading-5 text-slate-500">
          Sales analytics charts, revenue reports, and date-range reports will be added in a future
          phase (Reports). These features are not available yet.
        </p>
      </div>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f3f7f5] px-5 py-8">
          <div className="mx-auto h-64 max-w-6xl animate-pulse rounded-2xl bg-white" />
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
