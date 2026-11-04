import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { saveInventory } from "./actions";

export const metadata: Metadata = {
  title: "Inventory Control | Sikkha Nogori Admin",
  robots: { index: false, follow: false },
};

type Product = { id: string; title: string; slug: string; product_type: string; is_published: boolean; archived_at: string | null };
type Stock = { product_id: string; sku: string | null; stock_quantity: number; low_stock_threshold: number };

const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { supabase } = await requirePermission("manage_products", "/admin/dashboard");
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const [{ data: products, error: productError }, { data: stocks, error: stockError }, { data: movements, error: movementError }] = await Promise.all([
    supabase.from("products").select("id,title,slug,product_type,is_published,archived_at,price,cost_price,pricing_mode,markup_percent").is("archived_at", null).order("title").limit(1000),
    supabase.from("product_inventory").select("product_id,sku,stock_quantity,low_stock_threshold").limit(2000),
    supabase.from("inventory_movements").select("id,product_id,movement_type,quantity_change,quantity_before,quantity_after,note,created_at,products(title)").order("created_at", { ascending: false }).limit(50),
  ]);
  if (productError) throw new Error("Unable to load products.", { cause: productError });
  if (stockError) throw new Error("Unable to load inventory.", { cause: stockError });
  if (movementError) throw new Error("Unable to load inventory history.", { cause: movementError });
  const inventory = new Map((stocks ?? []).map((stock) => [stock.product_id, stock as Stock]));
  const rows = (products ?? []) as Product[];
  const tracked = rows.filter((product) => inventory.has(product.id));
  const low = tracked.filter((product) => {
    const stock = inventory.get(product.id)!;
    return stock.stock_quantity <= stock.low_stock_threshold;
  });
  const totalUnits = tracked.reduce((sum, product) => sum + inventory.get(product.id)!.stock_quantity, 0);
  const messages: Record<string, string> = {
    saved: "Inventory levels saved successfully.",
    invalid: "Please enter valid stock values.",
    "not-found": "The selected product could not be found.",
    "sku-exists": "That SKU is already assigned to another product.",
  };

  return (
    <main lang="en" className="min-h-screen bg-[#f3f7f5] px-4 py-6 text-slate-900 sm:px-7 sm:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[28px] bg-[#082f29] px-6 py-7 text-white shadow-[0_22px_60px_-35px_rgba(8,47,41,.65)] sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[36px] border-white/[0.04]" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.24em] text-emerald-200">Operations workspace</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Inventory Control</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">Track product stock, set low-stock alerts and keep your catalog operations organized.</p>
            </div>
            <Link href="/admin" className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 text-sm font-bold text-white hover:bg-white/10">Product catalog ↗</Link>
          </div>
          <div className="relative mt-8 grid grid-cols-3 gap-2 sm:max-w-2xl sm:gap-3">
            {[
              ["Catalog products", rows.length],
              ["Tracked products", tracked.length],
              ["Low stock", low.length],
            ].map(([name, count]) => (
              <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100/65">{name}</p>
                <p className="mt-1 text-2xl font-black tabular-nums">{count}</p>
              </div>
            ))}
          </div>
        </header>

        {status && messages[status] && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${status === "saved" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{messages[status]}</p>}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tracked stock units</p><p className="mt-2 text-3xl font-black tabular-nums">{totalUnits.toLocaleString("en-US")}</p><p className="mt-1 text-xs text-slate-500">Across products with stock records</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Low-stock products</p><p className="mt-2 text-3xl font-black tabular-nums text-amber-700">{low.length}</p><p className="mt-1 text-xs text-slate-500">At or below their alert threshold</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Not yet tracked</p><p className="mt-2 text-3xl font-black tabular-nums">{rows.length - tracked.length}</p><p className="mt-1 text-xs text-slate-500">Products without an inventory record</p></div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_-28px_rgba(15,55,42,.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-700">Stock register</p><h2 className="mt-1 text-xl font-extrabold">Product inventory</h2></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{rows.length} products</span>
          </div>
          {rows.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-500">No active catalog products found. Add products in the catalog first.</p> : (
            <div className="divide-y divide-slate-100">
              {rows.map((product) => {
                const stock = inventory.get(product.id);
                const quantity = stock?.stock_quantity ?? 0;
                const threshold = stock?.low_stock_threshold ?? 5;
                const isLow = !!stock && quantity <= threshold;
                return (
                  <article key={product.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(300px,.9fr)] sm:items-center sm:px-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{product.title}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${!stock ? "bg-slate-100 text-slate-600" : isLow ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{!stock ? "Not tracked" : isLow ? "Low stock" : "In stock"}</span></div>
                      <p className="mt-1 truncate text-xs text-slate-500">/{product.slug} · {product.product_type} · {product.is_published ? "Published" : "Unpublished"}</p>
                      <p className="mt-2 text-sm text-slate-600">{stock ? `${quantity.toLocaleString("en-US")} units available · Alert at ${threshold}` : "No stock record yet. Set an opening quantity to start tracking."}</p>
                    </div>
                    <form action={saveInventory} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                      <input type="hidden" name="productId" value={product.id} />
                      <div><label className={label} htmlFor={`sku-${product.id}`}>SKU</label><input id={`sku-${product.id}`} name="sku" maxLength={80} defaultValue={stock?.sku ?? ""} placeholder="Optional" className={input} /></div>
                      <div><label className={label} htmlFor={`qty-${product.id}`}>Quantity</label><input id={`qty-${product.id}`} name="quantity" type="number" min="0" max="100000000" step="1" required defaultValue={stock?.stock_quantity ?? 0} className={input} /></div>
                      <div><label className={label} htmlFor={`threshold-${product.id}`}>Low-stock alert</label><input id={`threshold-${product.id}`} name="threshold" type="number" min="0" max="100000000" step="1" required defaultValue={stock?.low_stock_threshold ?? 5} className={input} /></div>
                      <button type="submit" className="col-span-2 min-h-11 rounded-xl bg-[#0b5b48] px-4 text-sm font-extrabold text-white transition hover:bg-[#084b3c] sm:col-span-1">Save stock</button>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">Inventory is an administrative stock register. It does not automatically change product pricing, order status or payment records.</div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-700">Audit trail</p>
            <h2 className="mt-1 text-xl font-extrabold">Recent stock movements</h2>
            <p className="mt-1 text-xs text-slate-500">Latest 50 opening, adjustment and order deductions.</p>
          </div>
          {(movements ?? []).length === 0 ? <p className="px-6 py-8 text-sm text-slate-500">No stock movement has been recorded yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Movement</th><th className="px-5 py-3">Change</th><th className="px-5 py-3">Before → After</th><th className="px-5 py-3">Note</th><th className="px-5 py-3">Date</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{(movements ?? []).map((movement: any) => <tr key={movement.id}><td className="px-5 py-3 font-semibold">{movement.products?.title ?? "Product"}</td><td className="px-5 py-3 capitalize">{movement.movement_type.replace("_", " ")}</td><td className={`px-5 py-3 font-bold tabular-nums ${movement.quantity_change < 0 ? "text-rose-700" : "text-emerald-700"}`}>{movement.quantity_change > 0 ? "+" : ""}{movement.quantity_change}</td><td className="px-5 py-3 tabular-nums">{movement.quantity_before} → {movement.quantity_after}</td><td className="max-w-56 truncate px-5 py-3 text-slate-500">{movement.note ?? "—"}</td><td className="whitespace-nowrap px-5 py-3 text-slate-500">{new Date(movement.created_at).toLocaleString("en-GB")}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
