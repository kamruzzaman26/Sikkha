import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
export const metadata: Metadata = { title: "Reports | Sikkha Nogori Admin", robots: { index: false, follow: false } };
export default async function ReportsPage(){
 await connection(); const {supabase}=await requirePermission("view_reports","/admin/dashboard");
 const [orders,products,posts,paid]=await Promise.all([
  supabase.from("orders").select("id",{count:"exact",head:true}),
  supabase.from("products").select("id",{count:"exact",head:true}),
  supabase.from("posts").select("id",{count:"exact",head:true}),
  supabase.from("orders").select("total_amount,currency").eq("payment_status","paid").order("created_at",{ascending:false}).limit(1000)
 ]);
 if(orders.error||products.error||posts.error||paid.error) throw new Error("Unable to load reports.",{cause:orders.error||products.error||posts.error||paid.error});
 const totals=new Map<string,number>(); for(const row of paid.data??[]){const currency=row.currency||"Unknown";totals.set(currency,(totals.get(currency)||0)+Number(row.total_amount||0));}
 const money=Array.from(totals.entries());
 const cards=[["Total orders",orders.count??0],["Catalog products",products.count??0],["Blog posts",posts.count??0],["Paid orders",paid.data?.length??0]];
 return <main lang="en" className="min-h-screen px-4 py-7 text-slate-900 sm:px-8"><div className="mx-auto max-w-6xl">
 <header className="rounded-3xl bg-[#082f29] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Business intelligence</p><h1 className="mt-2 text-3xl font-black">Reports & Analytics</h1><p className="mt-2 text-sm text-emerald-50/75">Live summaries from orders, catalog and publishing data.</p></header>
 <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value])=><article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{Number(value).toLocaleString("en-US")}</p></article>)}</section>
 <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-extrabold">Paid order value by currency</h2><p className="mt-1 text-sm text-slate-500">Calculated from the latest 1,000 paid orders. Currency totals are kept separate.</p>{money.length?<div className="mt-5 divide-y divide-slate-100">{money.map(([currency,total])=><div key={currency} className="flex items-center justify-between py-3"><span className="font-semibold text-slate-700">{currency}</span><span className="text-lg font-black tabular-nums">{total.toLocaleString("en-US",{maximumFractionDigits:2})}</span></div>)}</div>:<p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No paid orders recorded yet.</p>}</section>
 </div></main>;
}