import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { saveMarketing } from "../modules-actions";
export const metadata: Metadata = { title: "Marketing | Sikkha Nogori Admin", robots: { index: false, follow: false } };
const field = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";
export default async function MarketingAdmin({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 await connection(); const {supabase}=await requirePermission("manage_marketing","/admin/dashboard");
 const [{data,error},{status}]=await Promise.all([supabase.from("site_settings").select("value").eq("key","marketing").maybeSingle(),searchParams]);
 if(error) throw new Error("Unable to load marketing campaigns.",{cause:error});
 const campaigns=Array.isArray(data?.value)?data.value:[];
 const counts={draft:campaigns.filter((c:any)=>c.status==="draft").length,ready:campaigns.filter((c:any)=>c.status==="ready").length,archived:campaigns.filter((c:any)=>c.status==="archived").length};
 return <main lang="en" className="min-h-screen px-4 py-7 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl">
 <header className="rounded-3xl bg-[#082f29] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Growth workspace</p><h1 className="mt-2 text-3xl font-black">Marketing Campaigns</h1><p className="mt-2 text-sm text-emerald-50/75">Plan and organize campaign copy for website, social and email channels.</p></header>
 {status&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{status==="saved"?"Campaigns saved.":"Please check the campaign data and try again."}</p>}
 <div className="mt-5 grid grid-cols-3 gap-3">{[["Draft",counts.draft],["Ready",counts.ready],["Archived",counts.archived]].map(([name,count])=><div key={String(name)} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{name}</p><p className="mt-1 text-2xl font-black">{count}</p></div>)}</div>
 <form action={saveMarketing} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-extrabold">Campaign library</h2><p className="mt-1 text-sm text-slate-500">Manage campaign briefs and ready-to-use copy. This module does not send messages or activate discounts.</p>
 <textarea name="campaigns" className={field+" mt-5 min-h-[340px] font-mono text-xs leading-6"} spellCheck={false} defaultValue={JSON.stringify(campaigns,null,2)}/>
 <p className="mt-2 text-xs text-slate-500">Each campaign: name, channel (Website, Facebook, Email or Other), message, status (draft, ready or archived).</p><div className="mt-5 flex justify-end"><button className="min-h-11 rounded-xl bg-[#0b5b48] px-6 text-sm font-extrabold text-white hover:bg-[#084b3c]">Save campaigns</button></div></form>
 </div></main>;
}