import type { Metadata } from "next";
import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Commission & Settlement | Sikkha Nogori", robots: { index: false, follow: false } };

export default async function PartnerOperationsPage() {
  await connection();
  const { supabase } = await requireSuperAdmin();
  const [libraryResult, affiliateResult] = await Promise.all([
    supabase.from("library_commissions").select("id,assignment_id,library_id,order_total,commission_rate,commission_amount,settlement_status,settled_at").order("created_at",{ascending:false}).limit(200),
    supabase.from("affiliate_product_commissions").select("id,order_id,order_item_id,product_id,affiliate_user_id,commission_type,commission_value,commission_base_amount,commission_amount,status,created_at").order("created_at",{ascending:false}).limit(200),
  ]);
  if (libraryResult.error) throw new Error("লাইব্রেরি কমিশন তথ্য লোড করা যায়নি।",{cause:libraryResult.error});
  if (affiliateResult.error) throw new Error("অ্যাফিলিয়েট কমিশন তথ্য লোড করা যায়নি।",{cause:affiliateResult.error});
  const rows = libraryResult.data ?? [];
  const affiliateRows = affiliateResult.data ?? [];
  return <main lang="bn" className="mx-auto min-h-screen max-w-[1500px] bg-[#f4f6fa] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
    <header className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">LIBRARY PARTNERSHIP / STEP 05</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Commission & Settlement</h1><p className="mt-1.5 max-w-3xl text-[15px] leading-6 text-slate-600">লাইব্রেরির কমিশন, পাওনা ও পেমেন্ট সেটেলমেন্ট পর্যবেক্ষণ করুন।</p><p className="mt-4 inline-flex rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold text-brand-900">মোট রেকর্ড: {rows.length}</p></header>
    <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>{rows[0] ? Object.keys(rows[0]).map((key)=><th key={key} className="px-4 py-3 font-bold">{key.replaceAll("_"," ")}</th>) : <th className="px-4 py-3">কমিশন ও সেটেলমেন্ট</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row,index)=><tr key={String(row.id ?? index)}>{Object.entries(row).map(([key,value])=><td key={key} className="max-w-64 px-4 py-3 text-slate-700">{value === null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}</td>)}</tr>) : <tr><td className="px-4 py-10 text-center text-slate-500">এখনো কোনো কমিশন রেকর্ড তৈরি হয়নি।</td></tr>}</tbody></table></section>
    <p className="mt-4 text-xs leading-5 text-slate-500">লাইব্রেরি কমিশন ও পণ্যভিত্তিক অ্যাফিলিয়েট কমিশন আলাদা হিসাব হিসেবে রাখা হয়। কমিশন payout/settlement অনুমোদিত প্রাপ্তবয়স্ক ব্যবসায়িক প্রতিনিধির তত্ত্বাবধানে পরিচালিত হবে।</p>
    <section className="mt-10">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">Affiliate Referral Commissions</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">প্রতিটি Direct-sale পণ্যের নির্ধারিত কমিশন আলাদাভাবে হিসাব হয়। পেমেন্ট যাচাইয়ের পর রেকর্ড তৈরি হয়; অর্ডার refund হলে কমিশন Reversed হয়।</p>
        <p className="mt-3 inline-flex rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold text-brand-900">মোট রেকর্ড: {affiliateRows.length}</p>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Affiliate User</th>
              <th className="px-4 py-3">Rule</th>
              <th className="px-4 py-3">Commission Base</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {affiliateRows.length ? affiliateRows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono text-xs">{row.order_id.slice(0, 8)}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.product_id.slice(0, 8)}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.affiliate_user_id.slice(0, 8)}</td>
                <td className="px-4 py-3">{row.commission_type === "percentage" ? `${row.commission_value}%` : `৳${row.commission_value} / unit`}</td>
                <td className="px-4 py-3 tabular-nums">৳{row.commission_base_amount}</td>
                <td className="px-4 py-3 font-semibold tabular-nums">৳{row.commission_amount}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{row.status}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(row.created_at).toLocaleString("en-GB")}</td>
              </tr>
            )) : <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">এখনো কোনো অ্যাফিলিয়েট কমিশন তৈরি হয়নি।</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </main>;
}
