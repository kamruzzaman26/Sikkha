import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { saveGeneralSettings } from "../settings-actions";
import { AdminSubmitButton } from "@/components/admin-submit-button";

export const metadata: Metadata = { title: "Website Settings | Sikkha Nogori Admin", robots: { index: false, follow: false } };
const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600";
type General = { site_name?: string; tagline?: string; contact_email?: string; contact_phone?: string; address?: string; currency?: string; social?: { facebook?: string; instagram?: string; youtube?: string } };
export default async function WebsiteSettingsPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  await connection();
  const { supabase } = await requirePermission("manage_settings", "/admin/dashboard");
  const [{ data, error }, params] = await Promise.all([supabase.from("site_settings").select("value").eq("key","general").maybeSingle(), searchParams]);
  if (error) throw new Error("Unable to load website settings.", { cause: error });
  const s = (data?.value ?? {}) as General;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  return <main lang="en" className="min-h-screen bg-[#f3f7f5] px-4 py-6 text-slate-900 sm:px-7 sm:py-9"><div className="mx-auto max-w-5xl">
    <header className="rounded-[28px] bg-[#082f29] px-6 py-8 text-white shadow-xl sm:px-9"><p className="text-[10px] font-extrabold uppercase tracking-[.24em] text-emerald-200">Configuration center</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Website Settings</h1><p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">Manage your website identity, contact details and official social links.</p></header>
    {status && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{status==="saved"?"Website settings saved successfully.":"Please review the fields and try again."}</p>}
    <form action={saveGeneralSettings} className="mt-6 space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-700">Brand identity</p><h2 className="mt-1 text-xl font-extrabold">Site information</h2><p className="mt-1 text-sm text-slate-500">Core information used to identify your website.</p></div><div className="grid gap-4 sm:grid-cols-2">
      <div><label className={label} htmlFor="siteName">Website name</label><input className={input} id="siteName" name="siteName" required maxLength={100} defaultValue={s.site_name ?? "Sikkha Nogori"} /></div>
      <div><label className={label} htmlFor="tagline">Tagline</label><input className={input} id="tagline" name="tagline" maxLength={200} defaultValue={s.tagline ?? ""} placeholder="A short description of your website" /></div>
      <div><label className={label} htmlFor="currency">Default currency</label><select className={input} id="currency" name="currency" defaultValue={s.currency ?? "BDT"}><option value="BDT">BDT — Bangladeshi Taka</option><option value="USD">USD — US Dollar</option></select></div>
    </div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-700">Customer support</p><h2 className="mt-1 text-xl font-extrabold">Contact information</h2></div><div className="grid gap-4 sm:grid-cols-2">
      <div><label className={label} htmlFor="contactEmail">Support email</label><input className={input} id="contactEmail" name="contactEmail" type="email" maxLength={160} defaultValue={s.contact_email ?? ""} /></div>
      <div><label className={label} htmlFor="contactPhone">Contact phone</label><input className={input} id="contactPhone" name="contactPhone" maxLength={40} defaultValue={s.contact_phone ?? ""} /></div>
      <div className="sm:col-span-2"><label className={label} htmlFor="address">Business address</label><textarea className={input+" min-h-24"} id="address" name="address" maxLength={300} defaultValue={s.address ?? ""} /></div>
    </div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-700">Social presence</p><h2 className="mt-1 text-xl font-extrabold">Official social links</h2><p className="mt-1 text-sm text-slate-500">Only HTTPS links are accepted.</p></div><div className="grid gap-4 sm:grid-cols-2">
      {(["facebook","instagram","youtube"] as const).map((key)=><div key={key}><label className={label} htmlFor={key}>{key[0].toUpperCase()+key.slice(1)} URL</label><input className={input} id={key} name={key} type="url" placeholder="https://" defaultValue={s.social?.[key] ?? ""} /></div>)}
    </div></section>
    <div className="flex justify-end"><AdminSubmitButton pendingLabel="Saving settings…" className="min-h-12 rounded-xl bg-[#0b5b48] px-7 text-sm font-extrabold text-white shadow-lg transition hover:bg-[#084b3c]">Save website settings</AdminSubmitButton></div>
    </form></div></main>;
}
