import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { registerCustomer } from "@/app/login/actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = {
  title: "অ্যাকাউন্ট তৈরি | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const messages = {
  invalid: "তথ্য যাচাই করুন; পাসওয়ার্ড অন্তত ১২ অক্ষরের হতে হবে।",
  "signup-failed": "অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।",
  "check-email": "অ্যাকাউন্ট যাচাই করতে আপনার ইমেইল দেখুন।",
} as const;

async function RegisterContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message =
    status && Object.hasOwn(messages, status)
      ? messages[status as keyof typeof messages]
      : undefined;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="font-semibold text-emerald-700">
          ← শিক্ষা নগরী
        </Link>
        <h1 className="mt-8 text-3xl font-extrabold">নতুন গ্রাহক অ্যাকাউন্ট</h1>
        <p className="mt-3 leading-7 text-slate-600">
          নিজের অর্ডার ও কেনা পণ্য নিরাপদে দেখতে অ্যাকাউন্ট তৈরি করুন।
        </p>
        {message && (
          <p role="status" className="mt-5 rounded-lg bg-amber-50 px-4 py-3">
            {message}
          </p>
        )}
        <form action={registerCustomer} className="mt-7 grid gap-4">
          <div>
            <label htmlFor="register-name" className="mb-2 block font-semibold">
              আপনার নাম
            </label>
            <input
              id="register-name"
              name="displayName"
              autoComplete="name"
              maxLength={100}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
          <div>
            <label htmlFor="register-email" className="mb-2 block font-semibold">
              ইমেইল
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
          <div>
            <label htmlFor="register-password" className="mb-2 block font-semibold">
              পাসওয়ার্ড
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
            <p className="mt-1 text-sm text-slate-600">
              অন্তত ১২ অক্ষর দিন; ইমেইল যাচাই প্রয়োজন হতে পারে।
            </p>
          </div>
          <SubmitButton
            pendingLabel="অ্যাকাউন্ট তৈরি হচ্ছে…"
            className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800"
          >
            অ্যাকাউন্ট তৈরি করুন
          </SubmitButton>
        </form>
        <p className="mt-6 text-sm text-slate-600">
          আগে থেকেই অ্যাকাউন্ট আছে?{" "}
          <Link href="/login" className="font-semibold text-emerald-800 underline">
            লগইন করুন
          </Link>
        </p>
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
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <RegisterContent searchParams={searchParams} />
    </Suspense>
  );
}
