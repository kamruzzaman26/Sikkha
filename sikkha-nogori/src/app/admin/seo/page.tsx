import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminSeoForm } from "@/components/admin-seo-form";
import { requirePermission } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "SEO | Sikkha Nogori Admin", robots: { index: false, follow: false } };

type Raw = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");

type Check = { ok: boolean; title: string; why: string; fix?: { label: string; href: string } };

export default async function SeoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { supabase } = await requirePermission("manage_seo", "/admin/dashboard");
  const [{ data, error }, { data: generalRow }, { data: posts }, params] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle(),
    supabase.from("site_settings").select("value").eq("key", "general").maybeSingle(),
    supabase.from("posts").select("id,seo_description,featured_image_path").eq("status", "published").limit(500),
    searchParams,
  ]);
  if (error) throw new Error("Unable to load SEO settings.", { cause: error });
  const seo = (data?.value ?? {}) as Raw;
  const general = (generalRow?.value ?? {}) as Raw;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;

  const title = s(seo.title);
  const description = s(seo.description);
  const publishedPosts = posts ?? [];
  const noMeta = publishedPosts.filter((p) => !s(p.seo_description)).length;
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const origin = s(seo.canonical_url) || envOrigin;
  const host = origin ? origin.replace(/^https?:\/\//, "") : "yourwebsite.com";

  const checks: Check[] = [
    { ok: seo.index !== false, title: "Google is allowed to list your site", why: "If this is off, nobody can find you on Google." },
    { ok: title.length >= 30 && title.length <= 60, title: "Home page title is 30–60 characters", why: "Shorter titles waste space; longer ones get cut off in results." },
    { ok: description.length >= 70 && description.length <= 160, title: "Home page description is 70–160 characters", why: "A good description makes more people click your result." },
    { ok: Boolean(s(seo.og_image)), title: "Share image is set", why: "Links shared on Facebook/WhatsApp look far more attractive with a picture." },
    { ok: Boolean(s(seo.google_verification)), title: "Google Search Console is connected", why: "Lets you see how Google views your site and request indexing." },
    { ok: Boolean(s(general.site_name)) && Boolean(s(general.contact_email) || s(general.contact_phone)), title: "Business name and contact details are filled in", why: "Google trusts sites that show who is behind them.", fix: { label: "Open settings", href: "/admin/settings" } },
    { ok: Boolean(s(seo.analytics_id)), title: "Visitor analytics is on", why: "Shows which pages and articles bring visitors." },
    { ok: publishedPosts.length >= 5, title: `At least 5 published articles (you have ${publishedPosts.length})`, why: "Helpful articles are the main way a new site gets found.", fix: { label: "Write an article", href: "/admin/blog#editor" } },
    { ok: publishedPosts.length === 0 || noMeta === 0, title: noMeta ? `${noMeta} article(s) have no search description` : "Every article has a search description", why: "Articles without one get a random snippet.", fix: noMeta ? { label: "Fix in Blog", href: "/admin/blog" } : undefined },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const tone = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-rose-600";

  return (
    <main lang="en" className="mx-auto min-h-screen max-w-5xl bg-canvas px-4 py-6 text-slate-900 sm:px-7 sm:py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Growth</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">SEO — get found on Google</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-slate-600">SEO simply means helping Google understand your website so it shows it to people searching for books like yours. We already handle the technical parts for you — page titles, sitemap, structured data. Your job is the short list below.</p>
      </header>

      {status && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${status === "saved" ? "border-brand-200 bg-brand-50 text-brand-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>{status === "saved" ? "Saved. Search engines will see the update soon." : "Please check the fields (https links only, correct code formats) and try again."}</p>}

      <section className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">SEO health</p>
          <p className={`mt-2 text-6xl font-black tabular-nums ${tone}`}>{score}<span className="text-2xl">%</span></p>
          <p className="mt-2 text-sm text-slate-600">{checks.filter((c) => c.ok).length} of {checks.length} checks passed</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${score}%` }} /></div>
        </div>
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {checks.map((c) => (
            <li key={c.title} className="flex items-start gap-3 px-5 py-3.5">
              <span aria-hidden="true" className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${c.ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{c.ok ? "✓" : "!"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{c.title}</p>
                {!c.ok && <p className="mt-0.5 text-xs leading-5 text-slate-500">{c.why}</p>}
              </div>
              {!c.ok && c.fix && <Link href={c.fix.href} className="shrink-0 text-xs font-bold text-brand-700 hover:underline">{c.fix.label} →</Link>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-5 sm:p-7">
        <h2 className="text-lg font-bold text-brand-900">Your 4-step plan (no technical skill needed)</h2>
        <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
          <li><b>1. Fill the form below</b> — a clear title and description (use the live preview).</li>
          <li><b>2. Connect Google Search Console</b> (free) at <span className="font-semibold">search.google.com/search-console</span>. Add your site, choose “HTML tag”, paste the code in “Google Search Console code” below and save, then press Verify.</li>
          <li><b>3. Submit your sitemap.</b> In Search Console → Sitemaps, enter <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">sitemap.xml</code>. Your sitemap is generated automatically and includes every book, course, product and article{origin ? <> — <a className="font-semibold text-brand-700 underline" href={`${origin}/sitemap.xml`} target="_blank" rel="noreferrer">view it</a></> : null}.</li>
          <li><b>4. Publish one helpful article every week</b> — e.g. “How to start reading Seerah”, “Best Arabic books for beginners”. Link to your books inside the article.</li>
        </ol>
      </section>

      <div className="mt-6">
        <AdminSeoForm
          siteName={s(general.site_name) || "শিক্ষা নগরী"}
          host={host}
          initial={{
            title, description, keywords: s(seo.keywords), preferredDomain: s(seo.canonical_url), ogImage: s(seo.og_image),
            twitterHandle: s(seo.twitter_handle), googleVerification: s(seo.google_verification), bingVerification: s(seo.bing_verification),
            analyticsId: s(seo.analytics_id), index: seo.index !== false, follow: seo.follow !== false,
          }}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm sm:p-7">
        <h2 className="text-base font-bold text-slate-900">What the website already does for you</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Gives every page its own title, description and “canonical” address.</li>
          <li>Builds <code>/sitemap.xml</code> and <code>/robots.txt</code> automatically and keeps them up to date.</li>
          <li>Tells Google your business name, logo, contact details and social profiles (structured data).</li>
          <li>Marks each article as an Article with date and author, and shows a nice preview when shared.</li>
          <li>Keeps private pages (admin, cart, checkout, account) out of Google.</li>
        </ul>
      </section>
    </main>
  );
}
