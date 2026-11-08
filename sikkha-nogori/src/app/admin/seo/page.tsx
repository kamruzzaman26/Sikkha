import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { saveSeoSettings } from "../settings-actions";

export const metadata: Metadata = { title: "SEO Control | Sikkha Nogori Admin", robots: { index: false, follow: false } };
const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600";
type Seo = { title?: string; description?: string; keywords?: string; canonical_url?: string; og_image?: string; index?: boolean; follow?: boolean };
export default async function SeoPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  await connection();
  const { supabase } = await requirePermission("manage_seo", "/admin/dashboard");
  const [{ data, error }, params] = await Promise.all([supabase.from("site_settings").select("value").eq("key","seo").maybeSingle(), searchParams]);
  if (error) throw new Error("Unable to load SEO settings.", { cause: error });
  const s = (data?.value ?? {}) as Seo;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  return <main lang="en" className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-slate-900 sm:px-7 sm:py-9"><div className="mx-auto max-w-5xl">
    <header className="rounded-[28px] bg-[#0f172a] px-6 py-8 text-white shadow-xl sm:px-9"><p className="text-[10px] font-extrabold uppercase tracking-[.24em] text-brand-200">Search visibility</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">SEO Control</h1><p className="mt-2 max-w-xl text-sm leading-6 text-brand-50/75">Manage search appearance, metadata and indexing preferences for your website.</p></header>
    {status && <p role="status" className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900">{status==="saved"?"SEO settings saved successfully.":"Please review the fields and try again."}</p>}
    <form action={saveSeoSettings} className="mt-6 space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-brand-700">Search snippet</p><h2 className="mt-1 text-xl font-extrabold">Global metadata</h2><p className="mt-1 text-sm text-slate-500">Used as the default metadata for pages that do not define their own title or description.</p></div>
      <div className="space-y-4"><div><label className={label} htmlFor="title">Default SEO title</label><input className={input} id="title" name="title" required minLength={5} maxLength={70} defaultValue={s.title ?? "Sikkha Nogori | শিক্ষা নগরী"} /><p className="mt-1 text-xs text-slate-500">Recommended: 50–60 characters. Maximum 70.</p></div>
      <div><label className={label} htmlFor="description">Meta description</label><textarea className={input+" min-h-24"} id="description" name="description" required minLength={30} maxLength={170} defaultValue={s.description ?? "বই ও শেখার উপকরণ খুঁজে দেখুন Sikkha Nogori-তে।"} /><p className="mt-1 text-xs text-slate-500">Write a useful summary. Recommended: 120–160 characters.</p></div>
      <div><label className={label} htmlFor="keywords">Focus keywords</label><textarea className={input+" min-h-20"} id="keywords" name="keywords" maxLength={500} defaultValue={s.keywords ?? ""} placeholder="Comma-separated relevant search terms" /></div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-brand-700">Technical SEO</p><h2 className="mt-1 text-xl font-extrabold">Canonical & social preview</h2></div><div className="grid gap-4">
      <div><label className={label} htmlFor="canonicalUrl">Canonical website URL (optional)</label><input className={input} id="canonicalUrl" name="canonicalUrl" type="url" placeholder="https://example.com" defaultValue={s.canonical_url ?? ""} /></div>
      <div><label className={label} htmlFor="ogImage">Open Graph image URL (optional)</label><input className={input} id="ogImage" name="ogImage" type="url" placeholder="https://example.com/social-preview.jpg" defaultValue={s.og_image ?? ""} /></div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-4"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-brand-700">Crawler access</p><h2 className="mt-1 text-xl font-extrabold">Indexing preferences</h2><p className="mt-1 text-sm text-slate-500">These options control the default robots metadata for the public website.</p></div><div className="grid gap-3 sm:grid-cols-2">
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" name="index" value="true" defaultChecked={s.index ?? true} className="size-4 accent-brand-700" /><span><span className="block text-sm font-bold">Allow search indexing</span><span className="text-xs text-slate-500">Let search engines index public pages.</span></span></label>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" name="follow" value="true" defaultChecked={s.follow ?? true} className="size-4 accent-brand-700" /><span><span className="block text-sm font-bold">Allow link following</span><span className="text-xs text-slate-500">Allow crawlers to follow public links.</span></span></label>
    </div></section>
    <div className="flex justify-end"><button className="min-h-12 rounded-xl bg-[#2755d6] px-7 text-sm font-extrabold text-white shadow-lg transition hover:bg-[#1b3068]">Save SEO settings</button></div>
    </form></div></main>;
}
