import Link from "next/link";
import { Suspense } from "react";
import { signInCustomer, signUpCustomer } from "./actions";
import { SubmitButton } from "@/components/submit-button";

const statusMessages = {
  invalid: "ইমেইল বা পাসওয়ার্ড যাচাই করুন।",
  "signup-failed":
    "অ্যাকাউন্ট তৈরি করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।",
  "check-email": "অ্যাকাউন্ট যাচাই করতে আপনার ইমেইল দেখুন।",
  "signed-out": "আপনি লগআউট করেছেন।",
  "sign-in-required": "চালিয়ে যেতে আগে লগইন করুন।",
  suspended: "এই অ্যাকাউন্টটি স্থগিত; প্রশাসকের সঙ্গে যোগাযোগ করুন।",
  "confirmation-failed":
    "ইমেইল যাচাইয়ের লিংকটি অবৈধ বা মেয়াদোত্তীর্ণ। আবার অ্যাকাউন্ট তৈরি করুন।",
} as const;

async function LoginContent({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message = status && Object.hasOwn(statusMessages, status)
    ? statusMessages[status as keyof typeof statusMessages]
    : undefined;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-semibold text-emerald-700">
          ← শিক্ষা নগরী
        </Link>
        <header className="mt-8">
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            গ্রাহক অ্যাকাউন্ট
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            অর্ডার করতে এবং নিজের অর্ডার দেখতে লগইন করুন অথবা নতুন অ্যাকাউন্ট
            তৈরি করুন।
          </p>
        </header>

        {message && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
          >
            {message}
          </p>
        )}

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">লগইন</h2>
            <form action={signInCustomer} className="mt-5 grid gap-4">
              <div>
                <label htmlFor="signin-email" className="mb-2 block font-semibold">
                  ইমেইল
                </label>
                <input
                  id="signin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label
                  htmlFor="signin-password"
                  className="mb-2 block font-semibold"
                >
                  পাসওয়ার্ড
                </label>
                <input
                  id="signin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <SubmitButton
                pendingLabel="লগইন হচ্ছে…"
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800"
              >
                লগইন করুন
              </SubmitButton>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">নতুন অ্যাকাউন্ট</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              অন্তত ১২ অক্ষরের পাসওয়ার্ড দিন। ইমেইল যাচাই চালু থাকলে আগে
              যাচাইকরণ সম্পন্ন করতে হবে।
            </p>
            <form action={signUpCustomer} className="mt-5 grid gap-4">
              <div>
                <label htmlFor="signup-name" className="mb-2 block font-semibold">
                  আপনার নাম
                </label>
                <input
                  id="signup-name"
                  name="displayName"
                  autoComplete="name"
                  maxLength={100}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="mb-2 block font-semibold">
                  ইমেইল
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-2 block font-semibold"
                >
                  পাসওয়ার্ড
                </label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>
              <SubmitButton
                pendingLabel="অ্যাকাউন্ট তৈরি হচ্ছে…"
                className="min-h-11 rounded-lg border border-emerald-700 px-4 py-2.5 font-bold text-emerald-800 hover:bg-emerald-50"
              >
                অ্যাকাউন্ট তৈরি করুন
              </SubmitButton>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-3xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
