import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminIcon, type AdminIconName } from "@/components/admin-icons";
import { formatBDT } from "@/lib/money";
import { createFinanceEntry } from "./actions";
import { requireSuperAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Accounts & Finance | Sikkha Nogori",
  robots: { index: false, follow: false },
};

type Entry = {
  id: string; entry_date: string; scope: string; entry_type: string;
  category: string; description: string; amount: number | string;
  counterparty: string | null; partner_id: string | null;
  payment_method: string | null; reference_no: string | null;
};

const labels: Record<string, string> = {
  income: "আয়", purchase: "বই ক্রয়", operating_expense: "পরিচালন খরচ",
  partner_payable: "পার্টনারের পাওনা", partner_payment: "পার্টনারকে পরিশোধ",
  owner_capital: "মালিকের মূলধন", refund: "রিফান্ড", adjustment: "সমন্বয়",
};
const icons: Record<string, AdminIconName> = {
  own_business: "wallet", partnership: "handshake",
};
const money = (value: number) => formatBDT(value);


function SummaryCard({ title, value, note, icon }: { title: string; value: string; note: string; icon: AdminIconName }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)]">
      <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><AdminIcon name={icon} /></span>
      <p className="mt-3 text-sm text-slate-600">{title}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

export default async function AccountsFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: string }>;
}) {
  await connection();
  const { supabase } = await requireSuperAdmin();
  const params = await searchParams;
  const scope = params.scope === "partnership" ? "partnership" : "own_business";

  const [entriesResult, partnersResult] = await Promise.all([
    supabase.from("finance_entries")
      .select("id,entry_date,scope,entry_type,category,description,amount,counterparty,partner_id,payment_method,reference_no")
      .order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(500),
    supabase.from("library_partners").select("id,library_name").order("library_name"),
  ]);
  if (entriesResult.error) throw new Error("হিসাবের লেজার লোড করা যায়নি।", { cause: entriesResult.error });
  if (partnersResult.error) throw new Error("পার্টনার তালিকা লোড করা যায়নি।", { cause: partnersResult.error });

  const allEntries = (entriesResult.data ?? []) as Entry[];
  const own = allEntries.filter((e) => e.scope === "own_business");
  const partner = allEntries.filter((e) => e.scope === "partnership");
  const current = scope === "own_business" ? own : partner;
  const ownIncome = own.filter((e) => e.entry_type === "income").reduce((s,e)=>s+Number(e.amount),0);
  const ownExpenses = own.filter((e) => ["purchase","operating_expense","refund"].includes(e.entry_type)).reduce((s,e)=>s+Number(e.amount),0);
  const partnerIncome = partner.filter((e)=>e.entry_type==="income").reduce((s,e)=>s+Number(e.amount),0);
  const partnerCosts = partner.filter((e)=>["partner_payable","operating_expense","refund"].includes(e.entry_type)).reduce((s,e)=>s+Number(e.amount),0);
  const partnerPayable = partner.filter((e)=>e.entry_type==="partner_payable").reduce((s,e)=>s+Number(e.amount),0);
  const partnerPaid = partner.filter((e)=>e.entry_type==="partner_payment").reduce((s,e)=>s+Number(e.amount),0);
  const profit = scope === "own_business" ? ownIncome-ownExpenses : partnerIncome-partnerCosts;
  const partners = partnersResult.data ?? [];
  const partnerNames = new Map(partners.map((p)=>[p.id,p.library_name]));

  return (
    <main lang="en" className="min-h-screen bg-[#f3f7f5] px-4 py-7 text-slate-900 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1400px]">
        <header className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Finance</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Accounts &amp; Finance</h1>
          <p className="mt-1.5 max-w-3xl text-[15px] leading-6 text-slate-600">নিজস্ব ব্যবসা ও পার্টনার লাইব্রেরির আয়, ব্যয়, পাওনা ও লেনদেন আলাদা লেজারে রাখুন।</p>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Finance accounts">
          <Link href="/admin/accounts-finance?scope=own_business" className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold ${scope==="own_business"?"border-emerald-800 bg-[#0a5748] text-white":"border-slate-200 bg-white text-slate-700"}`}><AdminIcon name="wallet" /> My Business</Link>
          <Link href="/admin/accounts-finance?scope=partnership" className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold ${scope==="partnership"?"border-emerald-800 bg-[#0a5748] text-white":"border-slate-200 bg-white text-slate-700"}`}><AdminIcon name="handshake" /> Partnership Accounts</Link>
        </nav>

        {params.status==="saved" && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">লেনদেন লেজারে যোগ হয়েছে।</p>}
        {params.status==="invalid" && <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">তথ্য যাচাই করুন। প্রয়োজনীয় ঘরগুলো সঠিকভাবে পূরণ করুন।</p>}
        {params.status==="save_error" && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">লেনদেন সংরক্ষণ হয়নি। অনুমতি ও তথ্য যাচাই করুন।</p>}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="মোট আয়" value={money(scope==="own_business"?ownIncome:partnerIncome)} note="লেজারে রেকর্ড করা আয়" icon="payments" />
          <SummaryCard title="মোট ব্যয়" value={money(scope==="own_business"?ownExpenses:partnerCosts)} note="ক্রয়, পরিচালন খরচ ও রিফান্ড/পাওনা" icon="receipt" />
          <SummaryCard title="নিট লাভ / ক্ষতি" value={money(profit)} note="রেকর্ডকৃত আয় − ব্যয়" icon="chart" />
          <SummaryCard title={scope==="own_business"?"মালিকের মূলধন":"পার্টনারের বকেয়া"} value={scope==="own_business"?money(own.filter(e=>e.entry_type==="owner_capital").reduce((s,e)=>s+Number(e.amount),0)):money(partnerPayable-partnerPaid)} note={scope==="own_business"?"লাভ নয়; মূলধন হিসেবে আলাদা":"পাওনা − পরিশোধ"} icon="spreadsheet" />
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)]">
            <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><AdminIcon name="add" /></span><div><h2 className="text-lg font-extrabold">নতুন লেনদেন যোগ করুন</h2><p className="text-xs text-slate-500">{scope==="own_business"?"নিজস্ব ব্যবসার লেজার":"পার্টনারশিপ লেজার"}</p></div></div>
            <form action={createFinanceEntry} className="mt-5 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="scope" value={scope} />
              <label className="grid gap-1 text-sm font-semibold text-slate-700">লেনদেনের ধরন
                <select name="entryType" required className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal">
                  {(scope==="own_business"?[
                    ["income","বিক্রির আয়"],["purchase","বই ক্রয়"],["operating_expense","পরিচালন খরচ"],["owner_capital","মালিকের মূলধন"],["refund","কাস্টমার রিফান্ড"],["adjustment","হিসাব সমন্বয়"]
                  ]:[
                    ["income","Sikkha Nogori-এর আয়/কমিশন"],["partner_payable","পার্টনারের পাওনা তৈরি"],["partner_payment","পার্টনারকে পেমেন্ট"],["operating_expense","অতিরিক্ত পরিচালন খরচ"],["refund","কাস্টমার রিফান্ড"],["adjustment","হিসাব সমন্বয়"]
                  ]).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              {scope==="partnership" && <label className="grid gap-1 text-sm font-semibold text-slate-700">পার্টনার লাইব্রেরি
                <select name="partnerId" required defaultValue="" className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value="" disabled>লাইব্রেরি নির্বাচন করুন</option>{partners.map((p)=><option key={p.id} value={p.id}>{p.library_name}</option>)}</select>
              </label>}
              <label className="grid gap-1 text-sm font-semibold text-slate-700">ক্যাটাগরি<input name="category" required maxLength={100} placeholder="যেমন: বই বিক্রি / ভাড়া / কুরিয়ার" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">টাকার পরিমাণ (৳)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">বিবরণ<input name="description" required maxLength={500} placeholder="কোন বই/কাজের জন্য এই লেনদেন?" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">তারিখ<input name="entryDate" type="date" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">লেনদেনের মাধ্যম<input name="paymentMethod" maxLength={80} placeholder="বিকাশ / নগদ / ব্যাংক" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">যার সঙ্গে লেনদেন<input name="counterparty" maxLength={180} placeholder="প্রকাশক / ক্রেতা / সরবরাহকারী" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">রেফারেন্স নম্বর<input name="referenceNo" maxLength={120} placeholder="রসিদ / ট্রানজেকশন আইডি" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">নোট<textarea name="notes" maxLength={1000} rows={2} className="rounded-xl border border-slate-300 px-3 py-2 font-normal" /></label>
              <button type="submit" className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0a5748] px-5 text-sm font-bold text-white transition hover:bg-[#084638] sm:col-span-2"><AdminIcon name="save" /> লেজারে সংরক্ষণ করুন</button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)]">
            <h2 className="text-lg font-extrabold">হিসাবের নিয়ম</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li><strong className="text-slate-900">আয়:</strong> বিক্রি বা কমিশন থেকে পাওয়া আয়।</li>
              <li><strong className="text-slate-900">বই ক্রয় / পার্টনারের পাওনা:</strong> লাভ-ক্ষতির হিসাবে ব্যয় হিসেবে গণনা হবে।</li>
              <li><strong className="text-slate-900">পার্টনারকে পেমেন্ট:</strong> বকেয়া কমাবে; দ্বিতীয়বার ব্যয় হিসেবে গণনা হবে না।</li>
              <li><strong className="text-slate-900">মালিকের মূলধন:</strong> নগদ প্রবাহে থাকবে, কিন্তু বিক্রির আয় বা লাভ নয়।</li>
              <li><strong className="text-slate-900">ভুল এন্ট্রি:</strong> পুরোনো রেকর্ড মুছে না দিয়ে বিপরীত সমন্বয় এন্ট্রি দিন।</li>
            </ul>
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">এই লেজারটি এখন ম্যানুয়াল এন্ট্রিভিত্তিক। পুরোনো অর্ডার ও স্টক থেকে স্বয়ংক্রিয়ভাবে আয়/COGS তৈরি করা হয়নি, যাতে একই বিক্রি দুবার গণনা না হয়।</p>
          </div>
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="text-lg font-extrabold">Transaction Ledger</h2><p className="text-xs text-slate-500">সর্বশেষ ৫০০টি রেকর্ড · এই বিভাগে {current.length}টি</p></div><span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">{scope==="own_business"?"নিজস্ব ব্যবসা":"পার্টনারশিপ"}</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs font-bold text-slate-600"><tr><th className="px-4 py-3">তারিখ</th><th className="px-4 py-3">ধরন</th><th className="px-4 py-3">বিবরণ</th><th className="px-4 py-3">পার্টনার / পক্ষ</th><th className="px-4 py-3">রেফারেন্স</th><th className="px-4 py-3 text-right">পরিমাণ</th></tr></thead><tbody className="divide-y divide-slate-100">{current.length?current.map((entry)=><tr key={entry.id}><td className="whitespace-nowrap px-4 py-3 text-slate-600">{entry.entry_date}</td><td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{labels[entry.entry_type]??entry.entry_type}</span><p className="mt-1 text-xs text-slate-500">{entry.category}</p></td><td className="max-w-xs px-4 py-3"><p className="font-semibold text-slate-800">{entry.description}</p>{entry.payment_method&&<p className="mt-1 text-xs text-slate-500">{entry.payment_method}</p>}</td><td className="px-4 py-3 text-slate-600">{entry.partner_id?partnerNames.get(entry.partner_id)??"পার্টনার":entry.counterparty??"—"}</td><td className="px-4 py-3 text-slate-500">{entry.reference_no??"—"}</td><td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums">{money(Number(entry.amount))}</td></tr>):<tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">এখনো কোনো লেনদেন যোগ করা হয়নি। উপরের ফর্ম থেকে প্রথম এন্ট্রি যোগ করুন।</td></tr>}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}
