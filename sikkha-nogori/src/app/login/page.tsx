import Link from "next/link";
import { Suspense } from "react";
import { signInCustomer, signUpCustomer } from "./actions";
import { SubmitButton } from "@/components/submit-button";

const statusMessages: Record<string, string> = {
  invalid: "ইমেইল/মোবাইল নম্বর ও পাসওয়ার্ড মিলিয়ে দেখুন।",
  "signup-failed": "অ্যাকাউন্ট তৈরি করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।",
  "phone-signup-unavailable": "মোবাইল নিবন্ধন এখনো চালু হয়নি। প্রশাসককে Phone Auth ও SMS যাচাই চালু করতে হবে।",
  "check-email": "আপনার ইমেইলে পাঠানো ৬ সংখ্যার যাচাইকরণ কোড লিখুন।",
  "signed-out": "আপনি নিরাপদে লগআউট করেছেন।",
  "sign-in-required": "চালিয়ে যেতে আগে লগইন করুন।",
  suspended: "এই অ্যাকাউন্টটি স্থগিত; প্রশাসকের সঙ্গে যোগাযোগ করুন।",
  "confirmation-failed": "যাচাইকরণ ব্যর্থ হয়েছে। নতুন কোড নিয়ে আবার চেষ্টা করুন।",
  "password-updated": "Password updated successfully.",
};

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message = status ? statusMessages[status] : undefined;

  return (
    <main className="min-h-screen bg-[#f5f8f6] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800"><span aria-hidden="true">←</span> শিক্ষা নগরী</Link>
        <header className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Customer account</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">আপনার শেখার যাত্রা শুরু হোক</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">একটি অ্যাকাউন্ট থেকেই অর্ডার, কেনা ডিজিটাল পণ্য ও প্রোফাইল পরিচালনা করুন।</p>
        </header>
        {message && <p role="status" className="mx-auto mt-6 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{message}</p>}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-xl">↪</span><div><h2 className="text-xl font-extrabold">অ্যাকাউন্টে লগইন</h2><p className="mt-1 text-sm text-slate-500">আগের অ্যাকাউন্ট ব্যবহার করুন</p></div></div>
            <form action={signInCustomer} className="mt-6 grid gap-4">
              <div><label htmlFor="signin-identifier" className="mb-2 block text-sm font-bold">ইমেইল অথবা মোবাইল নম্বর</label><input id="signin-identifier" name="identifier" type="text" autoComplete="username" placeholder="name@example.com / 01XXXXXXXXX" required maxLength={254} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></div>
              <div><label htmlFor="signin-password" className="mb-2 block text-sm font-bold">পাসওয়ার্ড</label><input id="signin-password" name="password" type="password" autoComplete="current-password" required maxLength={128} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></div>
              <SubmitButton pendingLabel="লগইন হচ্ছে…" className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-800">লগইন করুন</SubmitButton>
            </form>
            <p className="mt-4 text-right text-sm"><Link href="/forgot-password" className="font-bold text-emerald-800 hover:underline">পাসওয়ার্ড ভুলে গেছেন?</Link></p>
            <p className="mt-5 text-center text-xs leading-6 text-slate-500">মোবাইল নম্বর দিয়ে লগইন করতে হলে সেই নম্বরটি আগে Supabase Phone Auth-এ যাচাই করা থাকতে হবে।</p>
          </section>
          <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-xl">＋</span><div><h2 className="text-xl font-extrabold">নতুন অ্যাকাউন্ট তৈরি</h2><p className="mt-1 text-sm text-slate-500">ইমেইল অথবা মোবাইল—যেকোনো একটি দিয়ে</p></div></div>
            <form action={signUpCustomer} className="mt-6 grid gap-4">
              <div><label htmlFor="signup-name" className="mb-2 block text-sm font-bold">আপনার পূর্ণ নাম</label><input id="signup-name" name="displayName" autoComplete="name" placeholder="আপনার নাম লিখুন" required maxLength={100} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></div>
              <div><label htmlFor="signup-identifier" className="mb-2 block text-sm font-bold">ইমেইল অথবা মোবাইল নম্বর</label><input id="signup-identifier" name="identifier" type="text" autoComplete="username" placeholder="name@example.com / 01XXXXXXXXX" required maxLength={254} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /><p className="mt-1.5 text-xs text-slate-500">বাংলাদেশি নম্বর: 01XXXXXXXXX অথবা আন্তর্জাতিক ফরম্যাট: +8801XXXXXXXXX</p></div>
              <div><label htmlFor="signup-password" className="mb-2 block text-sm font-bold">পাসওয়ার্ড</label><input id="signup-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /><p className="mt-1.5 text-xs text-slate-500">কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।</p></div>
              <SubmitButton pendingLabel="অ্যাকাউন্ট তৈরি হচ্ছে…" className="min-h-12 rounded-xl border border-emerald-700 bg-emerald-50 px-5 font-bold text-emerald-900 transition hover:bg-emerald-100">অ্যাকাউন্ট তৈরি করুন</SubmitButton>
            </form>
            <p className="mt-4 text-center text-xs leading-6 text-slate-500">ইমেইল দিলে ৬ সংখ্যার Email OTP, মোবাইল দিলে SMS OTP যাচাই প্রয়োজন হতে পারে।</p>
          </section>
        </div>
        <p className="mt-7 text-center text-xs text-slate-500">আপনার অ্যাকাউন্টের তথ্য নিরাপদে সংরক্ষিত থাকবে।</p>
      </div>
    </main>
  );
}

export default function LoginPage({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  return <Suspense fallback={<main className="min-h-screen bg-[#f5f8f6] p-8"><div className="mx-auto max-w-4xl animate-pulse rounded-3xl bg-white p-8"><div className="h-8 w-64 rounded bg-slate-100" /><div className="mt-8 h-64 rounded-xl bg-slate-100" /></div></main>}><LoginContent searchParams={searchParams} /></Suspense>;
}
