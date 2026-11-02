import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { registerCustomer } from "@/app/login/actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "অ্যাকাউন্ট তৈরি | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const messages: Record<string, string> = {
  invalid: "নাম, ইমেইল/মোবাইল নম্বর ও পাসওয়ার্ড যাচাই করুন।",
  "signup-failed": "অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।",
  "phone-signup-unavailable": "মোবাইল নিবন্ধন চালু নেই। Phone Auth ও SMS যাচাই কনফিগার করতে হবে।",
  "check-email": "আপনার ইমেইলে পাঠানো যাচাইকরণ লিংক খুলুন।",
};

async function RegisterContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message = status ? messages[status] : undefined;

  return (
    <main className="min-h-screen bg-[#f5f8f6] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <Link href="/" className="text-sm font-bold text-emerald-800">← শিক্ষা নগরী</Link>
        <div className="mt-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Create account</p>
          <h1 className="mt-2 text-3xl font-black">নতুন গ্রাহক অ্যাকাউন্ট</h1>
          <p className="mt-3 leading-7 text-slate-600">নিজের অর্ডার, প্রোফাইল এবং কেনা ডিজিটাল পণ্য এক জায়গায় পরিচালনা করুন।</p>
        </div>
        {message && <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{message}</p>}
        <form action={registerCustomer} className="mt-7 grid gap-4">
          <div>
            <label htmlFor="register-name" className="mb-2 block text-sm font-bold">আপনার পূর্ণ নাম</label>
            <input id="register-name" name="displayName" autoComplete="name" placeholder="আপনার নাম লিখুন" required maxLength={100} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
          </div>
          <div>
            <label htmlFor="register-identifier" className="mb-2 block text-sm font-bold">ইমেইল অথবা মোবাইল নম্বর</label>
            <input id="register-identifier" name="identifier" type="text" autoComplete="username" placeholder="name@example.com / 01XXXXXXXXX" required maxLength={254} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
            <p className="mt-1.5 text-xs text-slate-500">বাংলাদেশি নম্বর 01XXXXXXXXX অথবা আন্তর্জাতিক +8801XXXXXXXXX</p>
          </div>
          <div>
            <label htmlFor="register-password" className="mb-2 block text-sm font-bold">পাসওয়ার্ড</label>
            <input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
            <p className="mt-1.5 text-xs text-slate-500">কমপক্ষে ১২ অক্ষরের পাসওয়ার্ড দিন।</p>
          </div>
          <SubmitButton pendingLabel="অ্যাকাউন্ট তৈরি হচ্ছে…" className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800">অ্যাকাউন্ট তৈরি করুন</SubmitButton>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">আগে থেকেই অ্যাকাউন্ট আছে? <Link href="/login" className="font-bold text-emerald-800 underline">লগইন করুন</Link></p>
      </section>
    </main>
  );
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f5f8f6] p-8"><div className="mx-auto max-w-xl animate-pulse rounded-3xl bg-white p-8"><div className="h-8 w-64 rounded bg-slate-100" /><div className="mt-8 h-56 rounded-xl bg-slate-100" /></div></main>}>
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}
