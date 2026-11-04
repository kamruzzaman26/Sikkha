import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminIcon, type AdminIconName } from "@/components/admin-icons";
import { requireSuperAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Accounts & Finance | Sikkha Nogori",
  robots: { index: false, follow: false },
};

const sections: {
  title: string;
  description: string;
  href: string;
  icon: AdminIconName;
  label: string;
}[] = [
  {
    title: "My Business",
    description: "নিজস্ব বই, স্টক, ক্রয়, বিক্রি, খরচ ও লাভ-ক্ষতির হিসাব।",
    href: "/admin/inventory",
    icon: "wallet",
    label: "নিজস্ব",
  },
  {
    title: "Partnership Accounts",
    description: "পার্টনার লাইব্রেরির পাওনা, কমিশন ও সেটেলমেন্টের হিসাব।",
    href: "/admin/partners/commissions",
    icon: "handshake",
    label: "পার্টনার",
  },
  {
    title: "All Transactions",
    description: "অর্ডার, পেমেন্ট ও আর্থিক লেনদেনের রেকর্ড।",
    href: "/admin/orders",
    icon: "receipt",
    label: "লেনদেন",
  },
  {
    title: "Profit & Loss Reports",
    description: "নিজস্ব ব্যবসা ও পার্টনারশিপের আয়-ব্যয়ের রিপোর্ট।",
    href: "/admin/reports",
    icon: "chart",
    label: "রিপোর্ট",
  },
  {
    title: "Payment & Settlement Reports",
    description: "পেমেন্ট, বকেয়া ও পার্টনার সেটেলমেন্ট রিপোর্ট।",
    href: "/admin/payments",
    icon: "spreadsheet",
    label: "পেমেন্ট",
  },
];

function FinanceCard({ item }: { item: (typeof sections)[number] }) {
  return (
    <Link
      href={item.href}
      className="group flex min-h-[178px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(15,55,42,0.45)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_30px_-20px_rgba(15,55,42,0.35)]"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
        <AdminIcon name={item.icon} className="size-[21px]" />
      </span>
      <span className="mt-4 flex items-center gap-2">
        <span className="text-base font-extrabold text-slate-950">{item.title}</span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{item.label}</span>
      </span>
      <span className="mt-2 text-sm leading-6 text-slate-600">{item.description}</span>
      <span className="mt-auto pt-4 text-sm font-bold text-emerald-800">Open section <span aria-hidden="true">→</span></span>
    </Link>
  );
}

export default async function AccountsFinancePage() {
  await connection();
  await requireSuperAdmin();

  return (
    <main lang="en" className="min-h-screen bg-[#f3f7f5] px-4 py-7 text-slate-900 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1200px]">
        <header className="rounded-[28px] bg-gradient-to-br from-[#0b5949] via-[#0a493e] to-[#082f29] px-6 py-7 text-white shadow-[0_18px_45px_-28px_rgba(5,48,39,0.75)] sm:px-8 sm:py-9">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-200">SIKKHA NOGORI · FINANCE</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Accounts & Finance</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-50/80 sm:text-base">
            নিজের ব্যবসা ও পার্টনার লাইব্রেরির হিসাব আলাদাভাবে পরিচালনা করুন।
          </p>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((item) => <FinanceCard key={item.title} item={item} />)}
        </section>

        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          হিসাবের বিভাগগুলো আলাদা রাখা হয়েছে। প্রতিটি বিভাগের প্রকৃত আয়, ব্যয়, পাওনা ও লাভের হিসাব দেখানোর জন্য সংশ্লিষ্ট accounting ledger ও settlement workflow সম্পন্ন করতে হবে।
        </p>
      </div>
    </main>
  );
}
