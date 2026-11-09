import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSiteSettings, telHref, whatsappHref } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSiteSettings();
  return {
    title: `যোগাযোগ | ${general.siteName}`,
    description: `${general.siteName}-এর সঙ্গে যোগাযোগের তথ্য।`,
    alternates: { canonical: "/contact" },
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const card = "flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const iconBox = "flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-800";

async function ContactDetails() {
  await connection();
  const { general } = await getSiteSettings();
  const envEmail = process.env.CONTACT_EMAIL?.trim();
  const email = general.contactEmail || (envEmail && isValidEmail(envEmail) ? envEmail : "");
  const wa = general.whatsapp ? whatsappHref(general.whatsapp) : "";
  const social = Object.entries(general.social).filter(([, url]) => url);
  const nothing = !email && !general.contactPhone && !general.helpline && !wa && !general.address && !general.businessHours;

  if (nothing) {
    return (
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">যোগাযোগের তথ্য শীঘ্রই যোগ করা হবে</h2>
        <p className="mt-2 leading-7 text-slate-600">এই মুহূর্তে কোনো যোগাযোগের ঠিকানা প্রকাশিত নেই।</p>
      </section>
    );
  }

  return (
    <>
      <ul className="mt-7 grid gap-4 sm:grid-cols-2">
        {email && (
          <li className={card}><span className={iconBox} aria-hidden="true">✉</span><div className="min-w-0"><h2 className="font-bold">ইমেইল</h2><a className="mt-1 block break-all font-semibold text-emerald-800 hover:underline" href={`mailto:${email}`}>{email}</a></div></li>
        )}
        {general.contactPhone && (
          <li className={card}><span className={iconBox} aria-hidden="true">☎</span><div><h2 className="font-bold">ফোন</h2><a className="mt-1 block font-semibold text-emerald-800 hover:underline" href={telHref(general.contactPhone)}>{general.contactPhone}</a></div></li>
        )}
        {general.helpline && general.helpline !== general.contactPhone && (
          <li className={card}><span className={iconBox} aria-hidden="true">☏</span><div><h2 className="font-bold">হেল্পলাইন</h2><a className="mt-1 block font-semibold text-emerald-800 hover:underline" href={telHref(general.helpline)}>{general.helpline}</a></div></li>
        )}
        {wa && (
          <li className={card}><span className={iconBox} aria-hidden="true">✆</span><div><h2 className="font-bold">হোয়াটসঅ্যাপ</h2><a className="mt-1 block font-semibold text-emerald-800 hover:underline" href={wa} target="_blank" rel="noopener noreferrer">মেসেজ পাঠান ({general.whatsapp})</a></div></li>
        )}
        {general.businessHours && (
          <li className={card}><span className={iconBox} aria-hidden="true">◷</span><div><h2 className="font-bold">সেবার সময়</h2><p className="mt-1 text-slate-600">{general.businessHours}</p></div></li>
        )}
        {general.address && (
          <li className={card}><span className={iconBox} aria-hidden="true">⌂</span><div><h2 className="font-bold">ঠিকানা</h2><p className="mt-1 whitespace-pre-line text-slate-600">{general.address}</p></div></li>
        )}
      </ul>
      {social.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bold">সোশ্যাল মিডিয়ায় আমরা</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {social.map(([key, url]) => (
              <li key={key}><a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold capitalize text-slate-700 hover:border-emerald-300 hover:text-emerald-800">{key === "x" ? "X" : key}</a></li>
            ))}
          </ul>
        </section>
      )}
      {general.returnPolicy && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900">রিটার্ন ও রিফান্ড</h2>
          <p className="mt-1 leading-7 text-amber-950/90">{general.returnPolicy}</p>
        </section>
      )}
    </>
  );
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-semibold text-emerald-700">← হোম</Link>
        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">সহায়তা</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">যোগাযোগ</h1>
          <p className="mt-3 leading-7 text-slate-600">বই, কোর্স, অর্ডার বা ওয়েবসাইট সম্পর্কে প্রশ্ন থাকলে আমাদের জানান।</p>
        </header>
        <Suspense fallback={<div className="mt-7 h-48 animate-pulse rounded-2xl bg-white" />}>
          <ContactDetails />
        </Suspense>
        <nav aria-label="আরও দেখুন" className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-emerald-800">
          <Link href="/books" className="hover:underline">বইয়ের সংগ্রহ</Link>
          <Link href="/courses" className="hover:underline">অনলাইন কোর্স</Link>
          <Link href="/blog" className="hover:underline">ব্লগ</Link>
        </nav>
      </div>
    </main>
  );
}
