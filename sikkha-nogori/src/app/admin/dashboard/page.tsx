import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import type { ReactNode } from "react";
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

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-sky-100 text-sky-900",
  processing: "bg-sky-100 text-sky-900",
  shipped: "bg-indigo-100 text-indigo-900",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-rose-100 text-rose-900",
};

type IconName =
  | "cash"
  | "today"
  | "month"
  | "orders"
  | "clock"
  | "check"
  | "x"
  | "box"
  | "publish"
  | "users"
  | "alert";

const iconPaths: Record<IconName, ReactNode> = {
  cash: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  today: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  month: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  orders: (
    <>
      <path d="M6 7h12l1 13H5z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.5" />
    </>
  ),
  x: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  box: (
    <>
      <path d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" />
      <path d="M12 12l8.5-4.5M12 12L3.5 7.5M12 12v9" />
    </>
  ),
  publish: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9.5 16h-19z" />
      <path d="M12 10v4M12 17.5v.01" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${className} shrink-0 fill-none stroke-current`}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

function Card({
  label,
  value,
  note,
  icon,
  tone = "green",
}: {
  label: string;
  value: string;
  note?: string;
  icon: IconName;
  tone?: "green" | "amber" | "rose" | "slate";
}) {
  const tones = {
    green: "bg-blue-50 text-blue-800",
    amber: "bg-amber-50 text-amber-900",
    rose: "bg-rose-50 text-rose-900",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
      {note && <p className="mt-1.5 text-xs leading-5 text-slate-600">{note}</p>}
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 mt-8">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-600">{hint}</p>}
    </div>
  );
}

function Unavailable({ what }: { what: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
      <Icon name="alert" className="mt-0.5 h-5 w-5" />
      <p>Unable to load {what}. Check database permissions or connectivity.</p>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
      {children}
    </div>
  );
}

async function DashboardContent() {
  await connection();
  const { supabase } = await requireAdmin("admin");

  const [productsResult, ordersResult, usersResult, affiliateLinksResult] = await Promise.all([
    supabase.from("products").select("id, is_published, archived_at"),
    supabase
      .from("orders")
      .select(
        "id, customer_name, total_amount, status, payment_status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.rpc("admin_list_users"),
    supabase.from("affiliate_links").select("id, is_active, partner"),
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
  const topMax = Math.max(1, ...top.map((item) => Number(item.quantity) || 0));
  const dhakaNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const dhakaTodayUtc = Date.UTC(dhakaNow.getUTCFullYear(), dhakaNow.getUTCMonth(), dhakaNow.getUTCDate());
  const salesDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(dhakaTodayUtc - (6 - index) * 86400000);
    const key = date.toISOString().slice(0, 10);
    const amount = orders.reduce((sum, order) => (
      order.payment_status === "verified" && dhakaDateKey(order.created_at) === key
        ? sum + (Number(order.total_amount) || 0)
        : sum
    ), 0);
    return { key, label: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }), amount };
  });
  const maxDailySales = Math.max(1, ...salesDays.map((day) => day.amount));

  return (
    <main lang="en" className="min-h-screen bg-[#f4f7ff] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="relative flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-[26px] bg-[#101b35] px-6 py-7 text-white shadow-xl sm:px-8 sm:py-8">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Overview</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">Welcome back, Admin!</h1>
            <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-blue-100/85">
              Here’s what is happening with your website today. Sales include only payment-verified orders (today and month are based on Dhaka time).
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/admin/orders"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-slate-50"
            >
              <Icon name="orders" className="h-[18px] w-[18px]" />
              Manage orders
            </Link>
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Icon name="box" className="h-[18px] w-[18px]" />
              Open product catalog
            </Link>
          </div>
        </header>

        <SectionTitle title="Sales Overview" hint="Verified sales and order activity" />
        {ordersResult.error ? (
          <Unavailable what="order data" />
        ) : (
          <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-lg font-bold tracking-tight text-slate-900">Sales Overview</h2><p className="mt-1 text-xs text-slate-500">Verified order revenue · Last 7 days</p></div>
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">7D</span>
              </div>
              <div className="mt-6 grid grid-cols-[auto_1fr] gap-3">
                <div className="flex h-52 flex-col justify-between pb-7 text-[10px] text-slate-400"><span>{formatBDT(maxDailySales)}</span><span>{formatBDT(maxDailySales * .66)}</span><span>{formatBDT(maxDailySales * .33)}</span><span>৳0</span></div>
                <div className="relative h-52 border-b border-slate-200">
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-7"><span className="border-t border-dashed border-slate-200" /><span className="border-t border-dashed border-slate-200" /><span className="border-t border-dashed border-slate-200" /><span className="border-t border-slate-200" /></div>
                  <div className="relative flex h-full items-end justify-around gap-2 px-2 pb-7">
                    {salesDays.map((day) => <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><div title={formatBDT(day.amount)} className="w-full max-w-12 rounded-t-lg bg-blue-600 transition hover:bg-blue-700" style={{ height: day.amount > 0 ? `${Math.max(4, day.amount / maxDailySales * 82)}%` : "3px" }} /><span className="absolute bottom-0 text-[10px] font-medium text-slate-500">{day.label}</span></div>)}
                  </div>
                </div>
              </div>
              {salesDays.every((day) => day.amount === 0) && <p className="mt-2 text-center text-xs text-slate-500">No verified sales recorded in the last 7 days.</p>}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Quick Actions</h2>
              <div className="mt-4 grid gap-2">
                {[{label:"Add Product",href:"/admin#products"},{label:"Manage Affiliate Links",href:"/admin#affiliate-links"},{label:"Manage Orders",href:"/admin/orders"},{label:"Manage Payments",href:"/admin/payments"},{label:"Manage Users",href:"/admin/users"}].map((action) => <Link key={action.label} href={action.href} className="flex min-h-12 items-center justify-between rounded-xl bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-800"><span>{action.label}</span><span aria-hidden="true">→</span></Link>)}
              </div>
            </section>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card label="Total sales" value={formatBDT(orderStats.totalSales)} icon="cash" />
            <Card label="Today's sales" value={formatBDT(orderStats.todaySales)} icon="today" />
            <Card label="Monthly sales" value={formatBDT(orderStats.monthSales)} icon="month" />
            <Card label="Total orders" value={String(orderStats.totalOrders)} icon="orders" tone="slate" />
            <Card label="Pending orders" value={String(orderStats.pending)} icon="clock" tone="amber" />
            <Card label="Completed orders" value={String(orderStats.completed)} icon="check" />
            <Card label="Cancelled orders" value={String(orderStats.cancelled)} icon="x" tone="rose" />
          </div>
          </>
        )}

        <SectionTitle title="Catalog, Customers & Affiliates" hint="Current catalog, registered accounts, and partner link activity" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {productsResult.error ? (
            <div className="sm:col-span-2 xl:col-span-4">
              <Unavailable what="product data" />
            </div>
          ) : (
            <>
              <Card label="Total products" value={String(productRows.length)} icon="box" tone="slate" />
              <Card
                label="Published"
                value={String(
                  productRows.filter((p) => p.is_published && !p.archived_at)
                    .length,
                )}
                icon="publish"
              />
            </>
          )}
          {usersResult.error ? (
            <div className="sm:col-span-2">
              <Unavailable what="user data" />
            </div>
          ) : (
            <Card
              label="Total users"
              value={String((usersResult.data ?? []).length)}
              note="All registered accounts, including administrators"
              icon="users"
              tone="slate"
            />
          )}
          {affiliateLinksResult.error ? (
            <div className="sm:col-span-2"><Unavailable what="affiliate link data" /></div>
          ) : (
            <>
              <Card label="Active affiliate links" value={String((affiliateLinksResult.data ?? []).filter((link) => link.is_active).length)} note="Enabled partner product links" icon="publish" />
              <Card label="Inactive affiliate links" value={String((affiliateLinksResult.data ?? []).filter((link) => !link.is_active).length)} note="Links currently disabled" icon="alert" tone="slate" />
            </>
          )}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
          <Icon name="alert" className="mt-0.5 h-5 w-5 text-slate-500" />
          <p>
            <strong className="font-semibold text-slate-900">Low stock / out of stock: not available yet.</strong>{" "}
            Inventory tracking has not been added to the database, so no figures are displayed.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight">Recent orders</h2>
              <Link
                href="/admin/orders"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
              >
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="mt-3">
                <Empty>No orders yet.</Empty>
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {recent.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">
                      {order.customer_name}
                    </span>
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
                        statusStyles[order.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {orderStatusLabels[order.status] ?? order.status}
                    </span>
                    <span className="w-28 text-right font-semibold tabular-nums text-slate-900">
                      {formatBDT(order.total_amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold tracking-tight">Best selling products</h2>
            {itemsResult.error ? (
              <div className="mt-3">
                <Unavailable what="sales data" />
              </div>
            ) : top.length === 0 ? (
              <div className="mt-3">
                <Empty>No sales data yet.</Empty>
              </div>
            ) : (
              <ol className="mt-3 flex flex-col gap-4">
                {top.map((item, index) => (
                  <li key={item.title} className="flex items-center gap-3 text-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-800">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate font-semibold text-slate-900">{item.title}</span>
                        <span className="shrink-0 tabular-nums text-slate-600">{item.quantity} units</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${Math.max(4, ((Number(item.quantity) || 0) / topMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <p className="mt-8 text-xs leading-5 text-slate-600">
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
        <main className="min-h-screen bg-[#f3f6f5] px-5 py-8">
          <div className="mx-auto h-64 max-w-6xl animate-pulse rounded-2xl bg-white" />
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
