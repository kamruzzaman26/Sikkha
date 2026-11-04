import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { verifyPhoneSignup } from "@/app/login/actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "মোবাইল নম্বর যাচাই | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

async function VerifyPhoneContent({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const phoneValue = Array.isArray(params.phone) ? params.phone[0] : params.phone;
  const statusValue = Array.isArray(params.status) ? params.status[0] : params.status;
  const phone = phoneValue && /^\+[1-9]\d{7,14}$/.test(phoneValue) ? phoneValue : "";
  const message = statusValue === "invalid"
    ? "কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে। আবার চেষ্টা করুন।"
    : "আপনার মোবাইলে পাঠানো যাচাইকরণ কোড লিখুন।";

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f8f6] px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/login" className="text-sm font-bold text-emerald-800">← লগইন পেজে ফিরুন</Link>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">Phone verification</p>
        <h1 className="mt-2 text-2xl font-black">মোবাইল নম্বর যাচাই</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <form action={verifyPhoneSignup} className="mt-6 grid gap-4">
          <div>
            <label htmlFor="verify-phone" className="mb-2 block text-sm font-bold">মোবাইল নম্বর</label>
            <input id="verify-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required defaultValue={phone} placeholder="+8801XXXXXXXXX" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
          </div>
          <div>
            <label htmlFor="verify-token" className="mb-2 block text-sm font-bold">SMS যাচাইকরণ কোড</label>
            <input id="verify-token" name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" minLength={6} maxLength={8} required placeholder="৬–৮ সংখ্যার কোড" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-center text-lg tracking-[0.3em] outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
          </div>
          <SubmitButton pendingLabel="যাচাই হচ্ছে…" className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800">নম্বর যাচাই করুন</SubmitButton>
        </form>
      </section>
    </main>
  );
}

export default function VerifyPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string | string[]; status?: string | string[] }>;
}) {
  return <Suspense fallback={<main className="min-h-screen bg-[#f5f8f6] p-8"><div className="mx-auto max-w-md animate-pulse rounded-3xl bg-white p-8"><div className="h-8 w-48 rounded bg-slate-100" /><div className="mt-8 h-48 rounded-xl bg-slate-100" /></div></main>}><VerifyPhoneContent searchParams={searchParams} /></Suspense>;
}
