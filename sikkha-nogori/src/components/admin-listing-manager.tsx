import Link from "next/link";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { requirePermission } from "@/lib/supabase/admin";
import {
  addListingProduct,
  deleteListing,
  moveListingProduct,
  removeListingProduct,
  saveListing,
} from "@/app/admin/merchandising-actions";

type Kind = "collections" | "curated_lists";
type Row = Record<string, unknown> & { id: string; slug: string; status: string; sort_order: number };

const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600";

const messages: Record<string, [string, boolean]> = {
  created: ["Saved. You can now add products below.", true],
  updated: ["Saved.", true],
  deleted: ["Deleted. The products themselves were not touched.", true],
  added: ["Product added.", true],
  removed: ["Product removed from this list.", true],
  already: ["That product is already in this list.", false],
  invalid: ["Please check the fields and try again.", false],
  duplicate: ["That slug is already used. Choose a different name or slug.", false],
  dates: ["The end date must be after the start date.", false],
  error: ["Something went wrong. Nothing was changed.", false],
};

function toLocalInput(value: unknown) {
  if (typeof value !== "string") return "";
  const dhaka = new Date(new Date(value).getTime() + 6 * 3600_000);
  return dhaka.toISOString().slice(0, 16);
}

export async function AdminListingManager({
  kind,
  searchParams,
}: {
  kind: Kind;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requirePermission("manage_products");
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = first(params.status);
  const editId = first(params.edit);
  const q = first(params.q).slice(0, 60).replace(/[%,()]/g, " ").trim();

  const isCollection = kind === "collections";
  const titleField = isCollection ? "name" : "title";
  const joinTable = isCollection ? "product_collections" : "curated_list_products";
  const fk = isCollection ? "collection_id" : "list_id";
  const path = isCollection ? "/admin/collections" : "/admin/curated-lists";
  const heading = isCollection ? "Collections" : "Curated Lists";
  const intro = isCollection
    ? "Bestseller, New Arrivals, Quick Deal and more. Pick products by hand (manual) or let a rule choose them. A product can be in many collections."
    : "Hand-picked lists such as “Best books for Ramadan”. Order products exactly as you want them shown.";

  const { data: listData, error } = await supabase.from(kind).select("*").order("sort_order").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`Unable to load ${heading}.`, { cause: error });
  const rows = (listData ?? []) as Row[];
  const editing = rows.find((row) => row.id === editId);

  const counts = new Map<string, number>();
  if (rows.length) {
    const { data: joinRows } = await supabase.from(joinTable).select(fk).in(fk, rows.map((r) => r.id)).limit(5000);
    for (const row of (joinRows ?? []) as Array<Record<string, string>>) counts.set(row[fk], (counts.get(row[fk]) ?? 0) + 1);
  }

  let members: Array<{ product_id: string; position: number; title: string; commerce_mode: string | null }> = [];
  let candidates: Array<{ id: string; title: string }> = [];
  if (editing) {
    const { data: memberRows } = await supabase.from(joinTable).select("product_id, position").eq(fk, editing.id).order("position").order("created_at");
    const ids = ((memberRows ?? []) as Array<{ product_id: string }>).map((m) => m.product_id);
    const titles = new Map<string, { title: string; commerce_mode: string | null }>();
    if (ids.length) {
      const { data: prods } = await supabase.from("products").select("id, title, commerce_mode").in("id", ids);
      for (const p of (prods ?? []) as Array<{ id: string; title: string; commerce_mode: string | null }>) titles.set(p.id, p);
    }
    members = ((memberRows ?? []) as Array<{ product_id: string; position: number }>).map((m) => ({
      ...m, title: titles.get(m.product_id)?.title ?? "(removed product)", commerce_mode: titles.get(m.product_id)?.commerce_mode ?? null,
    }));
    let request = supabase.from("products").select("id, title").is("archived_at", null).order("title").limit(40);
    if (q) request = request.ilike("title", `%${q}%`);
    const { data: prods } = await request;
    const taken = new Set(ids);
    candidates = ((prods ?? []) as Array<{ id: string; title: string }>).filter((p) => !taken.has(p.id));
  }

  const rule = (editing?.rule ?? {}) as { sort?: string; limit?: number; min_discount?: number; window_days?: number };
  const msg = messages[status];

  return (
    <main lang="en" className="mx-auto min-h-screen max-w-[1400px] bg-canvas px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Website Control</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-slate-600">{intro}</p>
      </header>
      {msg && <p role="status" aria-live="polite" className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${msg[1] ? "border-green-200 bg-green-50 text-green-800" : "border-rose-200 bg-rose-50 text-rose-900"}`}>{msg[1] ? "✓ " : ""}{msg[0]}</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{editing ? "Edit" : "Create new"}</h2>
            {editing && <Link href={path} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">+ New</Link>}
          </div>
          <form action={saveListing} className="mt-4 grid gap-4" key={editing?.id ?? "new"}>
            <input type="hidden" name="kind" value={kind} />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div><label className={label} htmlFor="f-title">{isCollection ? "Collection name" : "List title"}</label>
              <input id="f-title" name={titleField} required maxLength={160} defaultValue={(editing?.[titleField] as string) ?? ""} className={input} placeholder={isCollection ? "e.g. Bestseller" : "e.g. রমজানের সেরা বই"} /></div>
            <div><label className={label} htmlFor="f-slug">URL slug (optional)</label>
              <input id="f-slug" name="slug" maxLength={80} defaultValue={editing?.slug ?? ""} className={input} placeholder="auto-generated from the title" /></div>
            <div><label className={label} htmlFor="f-desc">Description</label>
              <textarea id="f-desc" name="description" rows={3} maxLength={600} defaultValue={(editing?.description as string) ?? ""} className={input} /></div>
            <div><label className={label} htmlFor="f-cover">Cover image URL (https)</label>
              <input id="f-cover" name="cover" type="url" defaultValue={(editing?.cover_image_url as string) ?? ""} className={input} placeholder="https://…" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={label} htmlFor="f-status">Status</label>
                <select id="f-status" name="status" defaultValue={editing?.status ?? "draft"} className={input}><option value="draft">Draft (hidden)</option><option value="published">Published</option></select></div>
              <div><label className={label} htmlFor="f-sort">Sort order</label>
                <input id="f-sort" name="sortOrder" type="number" defaultValue={editing?.sort_order ?? 0} className={input} /></div>
            </div>
            {isCollection ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className={label} htmlFor="f-type">How are products chosen?</label>
                    <select id="f-type" name="kindType" defaultValue={(editing?.kind as string) ?? "manual"} className={input}><option value="manual">Manual — I pick the products</option><option value="rule">Rule-based — automatic</option></select></div>
                  <div><label className={label} htmlFor="f-pos">Show on homepage</label>
                    <select id="f-pos" name="displayPosition" defaultValue={(editing?.display_position as string) ?? "none"} className={input}><option value="none">No</option><option value="homepage">Yes</option></select></div>
                </div>
                <fieldset className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-600">Rule (used only for rule-based)</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className={label} htmlFor="r-sort">Order by</label>
                      <select id="r-sort" name="ruleSort" defaultValue={rule.sort ?? "newest"} className={input}>
                        <option value="newest">Newest first</option><option value="bestselling">Best selling</option><option value="discount-high">Highest discount</option><option value="price-low">Price low → high</option><option value="price-high">Price high → low</option></select></div>
                    <div><label className={label} htmlFor="r-limit">Max products</label><input id="r-limit" name="ruleLimit" type="number" min={1} max={60} defaultValue={rule.limit ?? 12} className={input} /></div>
                    <div><label className={label} htmlFor="r-disc">Minimum discount %</label><input id="r-disc" name="ruleMinDiscount" type="number" min={0} max={100} defaultValue={rule.min_discount ?? 0} className={input} /></div>
                    <div><label className={label} htmlFor="r-days">Only products added in last N days (0 = any)</label><input id="r-days" name="ruleWindowDays" type="number" min={0} defaultValue={rule.window_days ?? 0} className={input} /></div>
                  </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className={label} htmlFor="f-start">Starts (Dhaka time, optional)</label><input id="f-start" name="startsAt" type="datetime-local" defaultValue={toLocalInput(editing?.starts_at)} className={input} /></div>
                  <div><label className={label} htmlFor="f-end">Ends (optional)</label><input id="f-end" name="endsAt" type="datetime-local" defaultValue={toLocalInput(editing?.ends_at)} className={input} /></div>
                </div>
              </>
            ) : (
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold">
                <input type="checkbox" name="showOnHomepage" defaultChecked={Boolean(editing?.show_on_homepage)} className="size-5" /> Show this list on the homepage
              </label>
            )}
            <div className="flex flex-wrap gap-3">
              <AdminSubmitButton pendingLabel="Saving…" className="min-h-11 rounded-xl bg-brand-700 px-6 text-sm font-bold text-white hover:bg-brand-800">{editing ? "Save changes" : "Create"}</AdminSubmitButton>
            </div>
          </form>
          {editing && (
            <form action={deleteListing} className="mt-4 border-t border-slate-100 pt-4">
              <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={editing.id} />
              <ConfirmDeleteButton message={`Delete “${String(editing[titleField])}”? Products are not deleted, only this grouping.`}>Delete this {isCollection ? "collection" : "list"}</ConfirmDeleteButton>
            </form>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          {editing && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Products ({members.length})</h2>
              {isCollection && editing.kind === "rule" && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">This is a rule-based collection: products are chosen automatically. Manually added products below are only used if you switch it back to manual.</p>}
              <form method="get" action={path} className="mt-3 flex gap-2">
                <input type="hidden" name="edit" value={editing.id} />
                <input name="q" defaultValue={q} placeholder="Search products to add…" className={input} aria-label="Search products" />
                <button className="min-h-11 shrink-0 rounded-xl border border-slate-300 px-4 text-sm font-bold">Search</button>
              </form>
              <form action={addListingProduct} className="mt-2 flex gap-2">
                <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={editing.id} />
                <select name="productId" required className={input} aria-label="Product to add" defaultValue="">
                  <option value="" disabled>{candidates.length ? "Choose a product…" : "No matching products"}</option>
                  {candidates.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <AdminSubmitButton pendingLabel="Adding…" className="min-h-11 shrink-0 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white hover:bg-brand-800">Add</AdminSubmitButton>
              </form>
              {members.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No products yet.</p> : (
                <ol className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {members.map((m, i) => (
                    <li key={m.product_id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                      <span className="w-6 text-xs font-bold text-slate-400">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{m.title}</span>
                      {m.commerce_mode && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{m.commerce_mode}</span>}
                      {(["up", "down"] as const).map((dir) => (
                        <form key={dir} action={moveListingProduct}>
                          <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={editing.id} /><input type="hidden" name="productId" value={m.product_id} /><input type="hidden" name="direction" value={dir} />
                          <button disabled={(dir === "up" && i === 0) || (dir === "down" && i === members.length - 1)} aria-label={`Move ${dir}`} className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30">{dir === "up" ? "↑" : "↓"}</button>
                        </form>
                      ))}
                      <form action={removeListingProduct}>
                        <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={editing.id} /><input type="hidden" name="productId" value={m.product_id} />
                        <button aria-label="Remove product" className="flex size-9 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50">✕</button>
                      </form>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">All {heading.toLowerCase()} ({rows.length})</h2>
            {rows.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Nothing created yet.</p> : (
              <ul className="mt-4 divide-y divide-slate-100">
                {rows.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{String(row[titleField])}</p>
                      <p className="text-xs text-slate-500">/{row.slug} · {counts.get(row.id) ?? 0} products</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "published" ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`}>{row.status === "published" ? "Published" : "Draft"}</span>
                    <Link href={`${path}?edit=${row.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold hover:bg-slate-50">Edit</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
