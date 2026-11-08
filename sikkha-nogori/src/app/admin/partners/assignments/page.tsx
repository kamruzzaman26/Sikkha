import type { Metadata } from "next";
import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Order Assignment | Sikkha Nogori", robots: { index: false, follow: false } };

export default async function PartnerOperationsPage() {
  await connection();
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase.from("library_order_assignments").select("id,order_id,library_id,status,assigned_at").order("created_at",{ascending:false}).limit(200);
  if (error) throw new Error("অর্ডার বণ্টন তথ্য লোড করা যায়নি।",{cause:error});
  const rows = data ?? [];
  return <main lang="bn" className="mx-auto min-h-screen max-w-[1500px] bg-[#f3f6f5] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
    <header className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">LIBRARY PARTNERSHIP / STEP 03</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Order Assignment</h1><p className="mt-1.5 max-w-3xl text-[15px] leading-6 text-slate-600">গ্রাহকের অর্ডার অনুমোদিত লাইব্রেরিতে বরাদ্দ করুন।</p><p className="mt-4 inline-flex rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">মোট রেকর্ড: {rows.length}</p></header>
    <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>{rows[0] ? Object.keys(rows[0]).map((key)=><th key={key} className="px-4 py-3 font-bold">{key.replaceAll("_"," ")}</th>) : <th className="px-4 py-3">অর্ডার বণ্টন</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row,index)=><tr key={String(row.id ?? index)}>{Object.entries(row).map(([key,value])=><td key={key} className="max-w-64 px-4 py-3 text-slate-700">{value === null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}</td>)}</tr>) : <tr><td className="px-4 py-10 text-center text-slate-500">এখনো কোনো অর্ডার লাইব্রেরিতে বরাদ্দ হয়নি।</td></tr>}</tbody></table></section>
    <p className="mt-4 text-xs leading-5 text-slate-500">এই পর্যায়ে তথ্য দেখার তালিকা তৈরি হয়েছে। নতুন রেকর্ড তৈরি, সম্পাদনা, অর্ডার বরাদ্দ ও সেটেলমেন্ট অ্যাকশন পরবর্তী ধাপে যুক্ত হবে।</p>
  </main>;
}
