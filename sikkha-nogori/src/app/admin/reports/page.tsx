import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { requirePermission } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Reports | Sikkha Nogori Admin",
  robots: { index: false, follow: false },
};

const iconPaths = {
  orders: (
    <>
      <path d="M6 7h12l1 13H5z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </>
  ),
  box: (
    <>
      <path d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" />
      <path d="M12 12l8.5-4.5M12 12L3.5 7.5M12 12v9" />
    </>
  ),
  post: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.5" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
} as const;

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof iconPaths; className?: string }) {
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

export default async function ReportsPage() {
  await connection();
  const { supabase } = await requirePermission("view_reports", "/admin/dashboard");
  const [orders, products, posts, paid] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("total_amount,currency")
      .eq("payment_status", "verified")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  if (orders.error || products.error || posts.error || paid.error) {
    throw new Error("Unable to load reports.", {
      cause: orders.error || products.error || posts.error || paid.error,
    });
  }

  const totals = new Map<string, number>();
  for (const row of paid.data ?? []) {
    const currency = row.currency || "Unknown";
    totals.set(currency, (totals.get(currency) || 0) + Number(row.total_amount || 0));
  }
  const money = Array.from(totals.entries());
  const grand = Math.max(1, ...money.map(([, total]) => total));

  const cards: { label: string; value: number; icon: keyof typeof iconPaths }[] = [
    { label: "Total orders", value: orders.count ?? 0, icon: "orders" },
    { label: "Catalog products", value: products.count ?? 0, icon: "box" },
    { label: "Blog posts", value: posts.count ?? 0, icon: "post" },
    { label: "Verified payments", value: paid.data?.length ?? 0, icon: "check" },
  ];

  return (
    <main lang="en" className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Business intelligence</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Reports &amp; Analytics</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-slate-600">
            Live summaries from orders, catalog and publishing data.
          </p>
        </header>

        <section aria-label="Key figures" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-600">{card.label}</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                  <Icon name={card.icon} />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums">
                {card.value.toLocaleString("en-US")}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold tracking-tight">Verified order value by currency</h2>
          <p className="mt-1 text-sm text-slate-600">
            Calculated from the latest 1,000 payment-verified orders. Currency totals are kept separate.
          </p>
          {money.length ? (
            <ul className="mt-5 flex flex-col gap-5">
              {money.map(([currency, total]) => (
                <li key={currency}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-slate-700">{currency}</span>
                    <span className="text-lg font-bold tabular-nums">
                      {total.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-brand-700"
                      style={{ width: `${Math.max(4, (total / grand) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-800">
                <Icon name="chart" className="h-6 w-6" />
              </span>
              <p className="text-base font-bold">No verified payments recorded yet</p>
              <p className="max-w-md text-sm text-slate-600">
                Totals will appear here, one per currency, as soon as payment-verified orders are recorded.
              </p>
              <Link
                href="/admin/orders"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Go to orders
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
