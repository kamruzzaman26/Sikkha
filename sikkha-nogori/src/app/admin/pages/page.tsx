import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { savePages } from "../modules-actions";
export const metadata: Metadata = { title: "Pages | Sikkha Nogori Admin", robots: { index: false, follow: false } };
const field = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";
export default async function PagesAdmin({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
 await connection();
 const { supabase } = await requirePermission("manage_homepage", "/admin/dashboard");
 const [{data,error},{status}] = await Promise.all([supabase.from("site_settings").select("value").eq("key","pages").maybeSingle(),searchParams]);
 if(error) throw new Error("Unable to load pages.",{cause:error});
 type PageEntry = { title: string; slug: string; status?: string };
 const pages = (Array.isArray(data?.value) ? data.value : []) as PageEntry[];
 return <main lang="en" className="min-h-screen px-4 py-7 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl">
 <header className="rounded-3xl bg-[#082f29] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Website control</p><h1 className="mt-2 text-3xl font-black">Pages</h1><p className="mt-2 text-sm text-emerald-50/75">Create and manage public information pages. Draft pages remain private.</p></header>
 {status && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{status==="saved"?"Pages saved.":"Please check the page data and try again."}</p>}
 <form action={savePages} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
 <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-extrabold">Page collection</h2><p className="mt-1 text-sm text-slate-500">Edit the JSON list below. Each page needs title, slug, content and status.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{pages.length} pages</span></div>
 <textarea name="pages" className={field+" mt-5 min-h-[360px] font-mono text-xs leading-6"} spellCheck={false} defaultValue={JSON.stringify(pages.length?pages:[{title:"About Us",slug:"about-us",content:"",status:"draft"}],null,2)} />
 <p className="mt-2 text-xs leading-5 text-slate-500">Use unique lowercase slugs with hyphens, such as about-us. Set status to published or draft. Maximum 50 pages.</p>
 <div className="mt-5 flex justify-end"><button className="min-h-11 rounded-xl bg-[#0b5b48] px-6 text-sm font-extrabold text-white hover:bg-[#084b3c]">Save pages</button></div>
 </form>
 <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold">Published pages</h2><ul className="mt-3 space-y-2">{pages.filter((p)=>p.status==="published").map((p:any)=><li key={p.slug} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="font-semibold">{p.title}</span><a className="font-bold text-emerald-800 hover:underline" href={"/page/"+p.slug} target="_blank" rel="noreferrer">Open page ↗</a></li>)}</ul></section>
 </div></main>;
}