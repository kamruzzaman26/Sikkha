import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { requirePermission } from "@/lib/supabase/admin";
import { deleteTag, saveTag } from "../merchandising-actions";

export const metadata: Metadata = { title: "Tags | Sikkha Nogori Admin", robots: { index: false, follow: false } };

const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";
const messages: Record<string, [string, boolean]> = {
  created: ["Tag created.", true], updated: ["Tag saved.", true], deleted: ["Tag deleted. Products keep all their other data.", true],
  invalid: ["Please enter a tag name (up to 80 characters).", false], duplicate: ["A tag with that slug already exists.", false], error: ["Something went wrong. Nothing was changed.", false],
};

export default async function TagsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { supabase } = await requirePermission("manage_products");
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const { data, error } = await supabase.from("tags").select("id, name, slug, is_active").order("name").limit(500);
  if (error) throw new Error("Unable to load tags.", { cause: error });
  const tags = (data ?? []) as Array<{ id: string; name: string; slug: string; is_active: boolean }>;
  const counts = new Map<string, number>();
  if (tags.length) {
    const { data: links } = await supabase.from("product_tags").select("tag_id").limit(10000);
    for (const l of (links ?? []) as Array<{ tag_id: string }>) counts.set(l.tag_id, (counts.get(l.tag_id) ?? 0) + 1);
  }
  const msg = status ? messages[status] : undefined;
  return (
    <main lang="en" className="mx-auto min-h-screen max-w-[1100px] bg-canvas px-4 py-6 text-slate-900 sm:px-7 sm:py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Website Control</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Tags</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-slate-600">Short labels such as “রমজান” or “পরীক্ষার প্রস্তুতি” that customers can filter by.</p>
      </header>
      {msg && <p role="status" aria-live="polite" className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${msg[1] ? "border-green-200 bg-green-50 text-green-800" : "border-rose-200 bg-rose-50 text-rose-900"}`}>{msg[1] ? "✓ " : ""}{msg[0]}</p>}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Add a tag</h2>
        <form action={saveTag} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="name" required maxLength={80} placeholder="Tag name" aria-label="Tag name" className={input} />
          <input name="slug" maxLength={80} placeholder="slug (optional)" aria-label="Slug" className={input} />
          <AdminSubmitButton pendingLabel="Saving…" className="min-h-11 rounded-xl bg-brand-700 px-6 text-sm font-bold text-white hover:bg-brand-800">Add tag</AdminSubmitButton>
        </form>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">All tags ({tags.length})</h2>
        {tags.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No tags yet.</p> : (
          <ul className="mt-4 divide-y divide-slate-100">
            {tags.map((tag) => (
              <li key={tag.id} className="flex flex-wrap items-center gap-3 py-3">
                <form action={saveTag} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={tag.id} />
                  <input name="name" defaultValue={tag.name} required maxLength={80} aria-label="Tag name" className={`${input} max-w-56`} />
                  <input name="slug" defaultValue={tag.slug} maxLength={80} aria-label="Slug" className={`${input} max-w-48`} />
                  <select name="is_active" defaultValue={String(tag.is_active)} aria-label="Status" className={`${input} max-w-32`}><option value="true">Active</option><option value="false">Hidden</option></select>
                  <AdminSubmitButton pendingLabel="Saving…" className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-50">Save</AdminSubmitButton>
                </form>
                <span className="text-xs text-slate-500">{counts.get(tag.id) ?? 0} products</span>
                <form action={deleteTag}><input type="hidden" name="id" value={tag.id} /><ConfirmDeleteButton message={`Delete tag “${tag.name}”?`}>Delete</ConfirmDeleteButton></form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
