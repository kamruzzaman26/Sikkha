import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { resendEmailSignupCode, verifyEmailSignup } from "@/app/login/actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "ইমেইল যাচাই | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

async function VerifyEmailContent({ searchParams }: { searchParams: Promise<{ email?: string | string[]; status?: string | string[] }> }) {
  const params = await searchParams;
  const emailValue = Array.isArray(params.email) ? params.email[0] : params.email;
  const statusValue = Array.isArray(params.status) ? params.status[0] : params.status;
  const email = emailValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) && emailValue.length <= 254 ? emailValue : "";
  const messages: Record<string, string> = {
    invalid: "কোডটি ভুল অথবা মেয়াদ শেষ হয়েছে। ইমেইল ও কোড মিলিয়ে আবার চেষ্টা করুন।",
    resent: "নতুন যাচাইকরণ কোড পাঠানো হয়েছে। ইনবক্স ও Spam ফোল্ডার দেখুন।",
    "resend-failed": "এখন নতুন কোড পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।",
  };
  const message = statusValue ? messages[statusValue] : "আপনার ইমেইলে পাঠানো ৬ সংখ্যার কোড লিখুন।";
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f8f6] px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/register" className="text-sm font-bold text-emerald-800">← নিবন্ধনে ফিরুন</Link>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">Email verification</p>
        <h1 className="mt-2 text-2xl font-black">ইমেইল যাচাই করুন</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <form action={verifyEmailSignup} className="mt-6 grid gap-4">
          <div><label htmlFor="verify-email-address" className="mb-2 block text-sm font-bold">ইমেইল ঠিকানা</label><input id="verify-email-address" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={email} placeholder="name@example.com" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></div>
          <div><label htmlFor="verify-email-token" className="mb-2 block text-sm font-bold">৬ সংখ্যার যাচাইকরণ কোড</label><input id="verify-email-token" name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="123456" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-center text-xl tracking-[0.4em] outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></div>
          <SubmitButton pendingLabel="যাচাই হচ্ছে…" className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800">কোড যাচাই করুন</SubmitButton>
        </form>
        <form action={resendEmailSignupCode} className="mt-3 grid gap-3">
          <input type="hidden" name="email" value={email} />
          <SubmitButton pendingLabel="কোড পাঠানো হচ্ছে…" className="min-h-12 rounded-xl border border-emerald-700 bg-emerald-50 px-5 font-bold text-emerald-900 hover:bg-emerald-100">আবার কোড পাঠান</SubmitButton>
        </form>
        <p className="mt-5 text-center text-xs leading-6 text-slate-500">কোড না পেলে Spam/Junk ফোল্ডার দেখুন।</p>
      </section>
    </main>
  );
}

export default function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string | string[]; status?: string | string[] }> }) {
  return <Suspense fallback={<main className="min-h-screen bg-[#f5f8f6] p-8"><div className="mx-auto max-w-md animate-pulse rounded-3xl bg-white p-8"><div className="h-8 w-48 rounded bg-slate-100" /><div className="mt-8 h-48 rounded-xl bg-slate-100" /></div></main>}><VerifyEmailContent searchParams={searchParams} /></Suspense>;
}
