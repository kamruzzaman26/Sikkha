import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { saveGeneralSettings } from "../settings-actions";
import { AdminSubmitButton } from "@/components/admin-submit-button";

export const metadata: Metadata = { title: "Website Settings | Sikkha Nogori Admin", robots: { index: false, follow: false } };
const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600";
type General = { logo_url?: string; favicon_url?: string; whatsapp?: string; business_hours?: string; announcement_text?: string; announcement_link?: string; footer_about?: string; return_policy?: string; site_name?: string; tagline?: string; contact_email?: string; contact_phone?: string; helpline?: string; delivery_note?: string; delivery_days?: number; delivery_days_dhaka?: number; delivery_days_outside?: number; delivery_delay_note?: string; address?: string; currency?: string; social?: { facebook?: string; instagram?: string; youtube?: string; tiktok?: string; linkedin?: string; x?: string } };
export default async function WebsiteSettingsPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  await connection();
  const { supabase } = await requirePermission("manage_settings", "/admin/dashboard");
  const [{ data, error }, params] = await Promise.all([supabase.from("site_settings").select("value").eq("key","general").maybeSingle(), searchParams]);
  if (error) throw new Error("Unable to load website settings.", { cause: error });
  const s = (data?.value ?? {}) as General;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
  const eyebrow = "text-xs font-bold uppercase tracking-[0.14em] text-brand-700";
  const where = (text: string) => <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium leading-5 text-brand-900">Shown on your site: {text}</p>;
  return (
    <main lang="en" className="mx-auto min-h-screen max-w-5xl bg-canvas px-4 py-6 text-slate-900 sm:px-7 sm:py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Configuration</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Website Settings</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-slate-600">Everything you save here appears on your public website automatically — the header, footer and Contact page. Each section tells you exactly where.</p>
      </header>
      {status && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${status==="saved" ? "border-brand-200 bg-brand-50 text-brand-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>{status==="saved"?"Saved. Your website now shows the new information.":"Please check the highlighted rules (HTTPS links only, valid email, number ranges) and try again."}</p>}
      <form action={saveGeneralSettings} className="mt-6 space-y-6">
        <section className={card}><p className={eyebrow}>Brand identity</p><h2 className="mt-1 text-xl font-bold">Name, logo and tagline</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="siteName">Website name</label><input className={input} id="siteName" name="siteName" required maxLength={100} defaultValue={s.site_name ?? "শিক্ষা নগরী"} /></div>
            <div><label className={label} htmlFor="tagline">Tagline</label><input className={input} id="tagline" name="tagline" maxLength={200} defaultValue={s.tagline ?? ""} placeholder="One line about your business" /></div>
            <div><label className={label} htmlFor="logoUrl">Logo image link (https)</label><input className={input} id="logoUrl" name="logoUrl" type="url" defaultValue={s.logo_url ?? ""} placeholder="https://…/logo.png" /><p className="mt-1 text-xs text-slate-500">Square image works best. Leave empty to show the first letter of your name.</p></div>
            <div><label className={label} htmlFor="faviconUrl">Browser tab icon link (https)</label><input className={input} id="faviconUrl" name="faviconUrl" type="url" defaultValue={s.favicon_url ?? ""} placeholder="https://…/icon.png" /></div>
            <div><label className={label} htmlFor="currency">Default currency</label><select className={input} id="currency" name="currency" defaultValue={s.currency ?? "BDT"}><option value="BDT">BDT — Bangladeshi Taka</option><option value="USD">USD — US Dollar</option></select></div>
          </div>
          {where("name, logo and tagline in the header and footer; icon in the browser tab.")}
        </section>

        <section className={card}><p className={eyebrow}>Customer support</p><h2 className="mt-1 text-xl font-bold">Contact information</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="contactEmail">Support email</label><input className={input} id="contactEmail" name="contactEmail" type="email" maxLength={160} defaultValue={s.contact_email ?? ""} /></div>
            <div><label className={label} htmlFor="contactPhone">Contact phone</label><input className={input} id="contactPhone" name="contactPhone" maxLength={40} defaultValue={s.contact_phone ?? ""} /></div>
            <div><label className={label} htmlFor="helpline">Helpline (top bar)</label><input className={input} id="helpline" name="helpline" maxLength={40} defaultValue={s.helpline ?? ""} placeholder="01XXXXXXXXX" /></div>
            <div><label className={label} htmlFor="whatsapp">WhatsApp number</label><input className={input} id="whatsapp" name="whatsapp" maxLength={40} defaultValue={s.whatsapp ?? ""} placeholder="01XXXXXXXXX" /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="businessHours">Support hours</label><input className={input} id="businessHours" name="businessHours" maxLength={200} defaultValue={s.business_hours ?? ""} placeholder="Sat–Thu, 10 AM – 8 PM" /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="address">Business address</label><textarea className={input+" min-h-24"} id="address" name="address" maxLength={300} defaultValue={s.address ?? ""} /></div>
          </div>
          {where("footer, Contact page and the site’s search-engine business information.")}
        </section>

        <section className={card}><p className={eyebrow}>Announcements</p><h2 className="mt-1 text-xl font-bold">Top bar and announcement banner</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={label} htmlFor="deliveryNote">Top bar notice</label><input className={input} id="deliveryNote" name="deliveryNote" maxLength={120} defaultValue={s.delivery_note ?? ""} placeholder="e.g. Cash on delivery available — leave empty to hide" /></div>
            <div><label className={label} htmlFor="announcementText">Announcement banner text</label><input className={input} id="announcementText" name="announcementText" maxLength={200} defaultValue={s.announcement_text ?? ""} placeholder="e.g. Eid sale: up to 30% off — leave empty to hide" /></div>
            <div><label className={label} htmlFor="announcementLink">Banner link (optional)</label><input className={input} id="announcementLink" name="announcementLink" maxLength={300} defaultValue={s.announcement_link ?? ""} placeholder="/books  or  https://…" /></div>
          </div>
          {where("a coloured strip above the header on every page. Clear the text to remove it.")}
        </section>

        <section className={card}><p className={eyebrow}>Delivery</p><h2 className="mt-1 text-xl font-bold">Delivery estimates</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="deliveryDaysDhaka">Inside Dhaka (days)</label><input className={input} id="deliveryDaysDhaka" name="deliveryDaysDhaka" type="number" min={1} max={60} step={1} defaultValue={s.delivery_days_dhaka ?? 2} /></div>
            <div><label className={label} htmlFor="deliveryDaysOutside">Outside Dhaka (days)</label><input className={input} id="deliveryDaysOutside" name="deliveryDaysOutside" type="number" min={1} max={60} step={1} defaultValue={s.delivery_days_outside ?? 3} /></div>
            <div><label className={label} htmlFor="deliveryDays">Other estimate (days, 0 = hide)</label><input className={input} id="deliveryDays" name="deliveryDays" type="number" min={0} max={60} step={1} defaultValue={s.delivery_days ?? 7} /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="deliveryDelayNote">Delay note (under the ⓘ button)</label><textarea className={input} id="deliveryDelayNote" name="deliveryDelayNote" maxLength={300} rows={2} defaultValue={s.delivery_delay_note ?? "অনাকাঙ্ক্ষিত কারণে এবং অনলাইন পেমেন্ট এর ক্ষেত্রে পেমেন্টে বিলম্ব হলে সম্ভাব্য ডেলিভারি তারিখ পরিবর্তিত হতে পারে।"} /></div>
          </div>
          {where("the estimated delivery date on every product page.")}
        </section>

        <section className={card}><p className={eyebrow}>Footer & policies</p><h2 className="mt-1 text-xl font-bold">About text and return policy</h2>
          <div className="mt-5 grid gap-4">
            <div><label className={label} htmlFor="footerAbout">Footer description</label><textarea className={input} id="footerAbout" name="footerAbout" rows={2} maxLength={400} defaultValue={s.footer_about ?? ""} placeholder="Two short sentences about your business" /></div>
            <div><label className={label} htmlFor="returnPolicy">Return &amp; refund note</label><textarea className={input} id="returnPolicy" name="returnPolicy" rows={2} maxLength={500} defaultValue={s.return_policy ?? ""} placeholder="e.g. Damaged items can be returned within 7 days." /></div>
          </div>
          {where("footer text and the Contact page.")}
        </section>

        <section className={card}><p className={eyebrow}>Social presence</p><h2 className="mt-1 text-xl font-bold">Official social links</h2><p className="mt-1 text-sm text-slate-500">Only https links are accepted.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(["facebook","instagram","linkedin","youtube","tiktok","x"] as const).map((key)=><div key={key}><label className={label} htmlFor={key}>{key === "x" ? "X (Twitter)" : key === "linkedin" ? "LinkedIn" : key === "youtube" ? "YouTube" : key === "tiktok" ? "TikTok" : key[0].toUpperCase()+key.slice(1)} link</label><input className={input} id={key} name={key} type="url" placeholder="https://" defaultValue={s.social?.[key] ?? ""} /></div>)}
          </div>
          {where("buttons in the footer and Contact page; also sent to Google as your official profiles.")}
        </section>

        <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-slate-200 bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <AdminSubmitButton pendingLabel="Saving…" className="min-h-12 rounded-xl bg-brand-600 px-8 text-sm font-bold text-white shadow-md transition hover:bg-brand-700">Save settings</AdminSubmitButton>
        </div>
      </form>
    </main>
  );
}
