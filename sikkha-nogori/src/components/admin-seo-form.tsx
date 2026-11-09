"use client";

import { useState } from "react";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { saveSeoSettings } from "@/app/admin/settings-actions";

export type SeoFormValues = {
  title: string; description: string; keywords: string; preferredDomain: string; ogImage: string;
  twitterHandle: string; googleVerification: string; bingVerification: string; analyticsId: string;
  index: boolean; follow: boolean;
};

const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";
const label = "block text-xs font-bold uppercase tracking-wide text-slate-600";
const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
const eyebrow = "text-xs font-bold uppercase tracking-[0.14em] text-brand-700";
const help = "mt-1 text-xs leading-5 text-slate-500";

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const tone = value === 0 ? "text-slate-400" : value < min ? "text-amber-600" : value > max ? "text-rose-600" : "text-green-600";
  const note = value === 0 ? "" : value < min ? "a bit short" : value > max ? "too long" : "good length";
  return <span className={`text-[11px] font-semibold tabular-nums ${tone}`}>{value}/{max} {note && `· ${note}`}</span>;
}

export function AdminSeoForm({ initial, siteName, host }: { initial: SeoFormValues; siteName: string; host: string }) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);

  return (
    <form action={saveSeoSettings} className="space-y-6">
      <section className={card}>
        <p className={eyebrow}>Step 1 · Your Google listing</p>
        <h2 className="mt-1 text-xl font-bold">How your home page looks on Google</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">This is the blue title and grey text people see when they search for your site. Make it clear and inviting.</p>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Live preview</p>
          <div className="mt-2 rounded-lg bg-white p-4 shadow-sm">
            <p className="truncate text-xs text-slate-500">{host}</p>
            <p className="mt-1 line-clamp-2 text-lg leading-snug text-[#1a0dab]">{title || `${siteName} | …`}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{description || "Your description appears here."}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-1.5 flex items-end justify-between gap-2"><label className={label} htmlFor="title">Home page title</label><Counter value={title.length} min={30} max={60} /></div>
            <input className={input} id="title" name="title" required minLength={5} maxLength={70} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sikkha Nogori | Islamic & educational books" />
            <p className={help}>Put what you sell first. Around 50–60 characters is ideal.</p>
          </div>
          <div>
            <div className="mb-1.5 flex items-end justify-between gap-2"><label className={label} htmlFor="description">Home page description</label><Counter value={description.length} min={70} max={160} /></div>
            <textarea className={`${input} min-h-24`} id="description" name="description" required minLength={30} maxLength={170} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Buy Islamic books, Arabic learning materials and courses…" />
            <p className={help}>One or two sentences. Mention what you offer and why someone should click. 120–160 characters is ideal.</p>
          </div>
          <div>
            <label className={`${label} mb-1.5`} htmlFor="keywords">Main search words (optional)</label>
            <textarea className={`${input} min-h-20`} id="keywords" name="keywords" maxLength={500} defaultValue={initial.keywords} placeholder="islamic books, arabic learning, bangla books" />
            <p className={help}>Separate with commas. Google barely uses this, so don’t spend long on it — the title and description matter far more.</p>
          </div>
        </div>
      </section>

      <section className={card}>
        <p className={eyebrow}>Step 2 · Sharing</p>
        <h2 className="mt-1 text-xl font-bold">Link previews on Facebook, WhatsApp and X</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={`${label} mb-1.5`} htmlFor="ogImage">Share image link (https)</label>
            <input className={input} id="ogImage" name="ogImage" type="url" defaultValue={initial.ogImage} placeholder="https://…/share.jpg" />
            <p className={help}>The picture shown when someone shares your link. Best size: 1200 × 630 pixels.</p>
          </div>
          <div>
            <label className={`${label} mb-1.5`} htmlFor="twitterHandle">X (Twitter) username</label>
            <input className={input} id="twitterHandle" name="twitterHandle" maxLength={16} defaultValue={initial.twitterHandle} placeholder="@yourname" />
          </div>
        </div>
      </section>

      <section className={card}>
        <p className={eyebrow}>Step 3 · Tell Google about your site</p>
        <h2 className="mt-1 text-xl font-bold">Search Console &amp; analytics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={`${label} mb-1.5`} htmlFor="canonicalUrl">Preferred website address</label>
            <input className={input} id="canonicalUrl" name="canonicalUrl" type="url" defaultValue={initial.preferredDomain} placeholder="https://www.yoursite.com" />
            <p className={help}>The one address you want Google to use (with or without www — pick one). Leave empty if unsure; the site already uses its main address.</p>
          </div>
          <div>
            <label className={`${label} mb-1.5`} htmlFor="googleVerification">Google Search Console code</label>
            <input className={input} id="googleVerification" name="googleVerification" maxLength={200} defaultValue={initial.googleVerification} placeholder="Paste only the code" />
            <p className={help}>Search Console → Add property → “HTML tag” → copy the text inside <code>content=&quot;…&quot;</code>.</p>
          </div>
          <div>
            <label className={`${label} mb-1.5`} htmlFor="bingVerification">Bing Webmaster code (optional)</label>
            <input className={input} id="bingVerification" name="bingVerification" maxLength={200} defaultValue={initial.bingVerification} />
          </div>
          <div className="sm:col-span-2">
            <label className={`${label} mb-1.5`} htmlFor="analyticsId">Google Analytics ID (optional)</label>
            <input className={input} id="analyticsId" name="analyticsId" maxLength={40} defaultValue={initial.analyticsId} placeholder="G-XXXXXXXXXX" />
            <p className={help}>Shows how many people visit and where they come from. Starts with <b>G-</b> (or <b>GTM-</b> for Tag Manager). Never runs inside the admin area.</p>
          </div>
        </div>
      </section>

      <section className={card}>
        <p className={eyebrow}>Advanced</p>
        <h2 className="mt-1 text-xl font-bold">Search engine access</h2>
        <p className="mt-1 text-sm text-slate-600">Keep both on unless you are still building the site. Turning “Allow indexing” off hides your whole site from Google.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" name="index" value="true" defaultChecked={initial.index} className="mt-0.5 size-4 accent-brand-700" /><span><span className="block text-sm font-bold">Allow indexing</span><span className="text-xs text-slate-500">Let Google list your public pages.</span></span></label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" name="follow" value="true" defaultChecked={initial.follow} className="mt-0.5 size-4 accent-brand-700" /><span><span className="block text-sm font-bold">Allow following links</span><span className="text-xs text-slate-500">Lets Google discover pages through your links.</span></span></label>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-slate-200 bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <AdminSubmitButton pendingLabel="Saving…" className="min-h-12 rounded-xl bg-brand-600 px-8 text-sm font-bold text-white shadow-md transition hover:bg-brand-700">Save SEO settings</AdminSubmitButton>
      </div>
    </form>
  );
}
