import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { saveNavigation } from "../modules-actions";
export const metadata: Metadata = { title: "Navigation | Sikkha Nogori Admin", robots: { index: false, follow: false } };
const field = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";
const defaults = [{label:"Home",href:"/",active:true},{label:"Books",href:"/books",active:true},{label:"Products",href:"/products",active:true},{label:"Courses",href:"/courses",active:true},{label:"Blog",href:"/blog",active:true},{label:"Contact",href:"/contact",active:true}];
export default async function NavigationAdmin({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 await connection(); const {supabase}=await requirePermission("manage_homepage","/admin/dashboard");
 const [{data,error},{status}]=await Promise.all([supabase.from("site_settings").select("value").eq("key","navigation").maybeSingle(),searchParams]);
 if(error) throw new Error("Unable to load navigation.",{cause:error});
 const items=Array.isArray(data?.value)?data.value:defaults;
 return <main lang="en" className="min-h-screen px-4 py-7 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl">
 <header className="rounded-3xl bg-[#082f29] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Website control</p><h1 className="mt-2 text-3xl font-black">Navigation Manager</h1><p className="mt-2 text-sm text-emerald-50/75">Configure menu labels, internal destinations and visibility.</p></header>
 {status&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{status==="saved"?"Navigation saved.":"Please check the menu data and try again."}</p>}
 <form action={saveNavigation} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-extrabold">Menu items</h2><p className="mt-1 text-sm text-slate-500">Provide an array of items. Only internal paths beginning with / are accepted.</p>
 <textarea name="items" className={field+" mt-5 min-h-[320px] font-mono text-xs leading-6"} spellCheck={false} defaultValue={JSON.stringify(items,null,2)}/>
 <p className="mt-2 text-xs text-slate-500">Each item: label, href, active. Maximum 20 items.</p><div className="mt-5 flex justify-end"><button className="min-h-11 rounded-xl bg-[#0b5b48] px-6 text-sm font-extrabold text-white hover:bg-[#084b3c]">Save navigation</button></div></form>
 </div></main>;
}