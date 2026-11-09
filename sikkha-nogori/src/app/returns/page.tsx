import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSiteSettings, telHref, whatsappHref } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSiteSettings();
  return {
    title: `রিটার্ন ও রিফান্ড নীতি | ${general.siteName}`,
    description: "পণ্য ফেরত ও টাকা ফেরত সম্পর্কিত নীতি ও যোগাযোগের নিয়ম।",
    alternates: { canonical: "/returns" },
  };
}

async function ReturnsContent() {
  await connection();
  const { general } = await getSiteSettings();
  const wa = general.whatsapp ? whatsappHref(general.whatsapp) : "";
  return (
    <>
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">আমাদের সরাসরি বিক্রি করা পণ্য</h2>
        {general.returnPolicy ? (
          <p className="mt-3 whitespace-pre-line leading-8 text-slate-700">{general.returnPolicy}</p>
        ) : (
          <p className="mt-3 leading-8 text-slate-600">রিটার্ন নীতি শীঘ্রই এখানে প্রকাশ করা হবে। ততক্ষণ অর্ডার সংক্রান্ত যেকোনো সমস্যায় আমাদের সঙ্গে যোগাযোগ করুন।</p>
        )}
      </section>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">অ্যাফিলিয়েট লিংকের পণ্য</h2>
        <p className="mt-3 leading-8 text-slate-700">অ্যাফিলিয়েট লিংকের মাধ্যমে অন্য বিক্রেতার কাছ থেকে কেনা পণ্যের ডেলিভারি, ফেরত ও রিফান্ড সংশ্লিষ্ট বিক্রেতার নীতি অনুযায়ী হয়।</p>
      </section>
      <section className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
        <h2 className="text-xl font-bold text-emerald-900">সমস্যা হলে কীভাবে জানাবেন</h2>
        <ul className="mt-3 space-y-2 leading-7 text-slate-700">
          <li>অর্ডার নম্বর ও পণ্যের ছবিসহ আমাদের জানান।</li>
          {general.contactPhone && <li>ফোন: <a className="font-semibold text-emerald-800 hover:underline" href={telHref(general.contactPhone)}>{general.contactPhone}</a></li>}
          {wa && <li>হোয়াটসঅ্যাপ: <a className="font-semibold text-emerald-800 hover:underline" href={wa} target="_blank" rel="noopener noreferrer">{general.whatsapp}</a></li>}
          {general.contactEmail && <li>ইমেইল: <a className="font-semibold text-emerald-800 hover:underline" href={`mailto:${general.contactEmail}`}>{general.contactEmail}</a></li>}
          {general.businessHours && <li>সেবার সময়: {general.businessHours}</li>}
        </ul>
      </section>
    </>
  );
}

export default function ReturnsPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-semibold text-emerald-700">← হোম</Link>
        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">নীতি</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">রিটার্ন ও রিফান্ড নীতি</h1>
        </header>
        <Suspense fallback={<div className="mt-7 h-48 animate-pulse rounded-2xl bg-white" />}>
          <ReturnsContent />
        </Suspense>
      </div>
    </main>
  );
}
