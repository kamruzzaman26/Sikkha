import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { loginAdmin } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "অ্যাডমিন লগইন | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const loginMessages: Record<string, string> = {
  invalid: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
  unauthorized: "এই অ্যাকাউন্টটি অ্যাডমিন হিসেবে অনুমোদিত নয়।",
};

async function AdminLoginContent({
  searchParams,
}: Pick<PageProps<"/admin/login">, "searchParams">) {
  const params = await searchParams;
  const errorValue = Array.isArray(params.error)
    ? params.error[0]
    : params.error;
  const errorMessage =
    errorValue && Object.hasOwn(loginMessages, errorValue)
      ? loginMessages[errorValue]
      : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="font-semibold text-emerald-700">
          ← শিক্ষা নগরী
        </Link>

        <p className="mt-8 text-sm font-bold text-emerald-700">
          প্রশাসনিক প্যানেল
        </p>
        <h1 className="mt-2 text-3xl font-bold">অ্যাডমিন লগইন</h1>
        <p className="mt-3 leading-7 text-slate-600">
          শুধু অনুমোদিত অ্যাডমিন অ্যাকাউন্ট দিয়ে প্রবেশ করুন।
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
          >
            {errorMessage}
          </p>
        )}

        <form action={loginAdmin} className="mt-6 grid gap-4">
          <div>
            <label
              htmlFor="admin-email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              ইমেইল
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={320}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              পাসওয়ার্ড
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>

          <button
            type="submit"
            className="mt-2 min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            লগইন
          </button>
        </form>
      </section>
    </main>
  );
}

export default function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10 text-slate-900">
          <section className="w-full max-w-md animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-48 rounded bg-slate-100" />
            <div className="mt-8 h-12 rounded bg-slate-100" />
            <div className="mt-4 h-12 rounded bg-slate-100" />
          </section>
        </main>
      }
    >
      <AdminLoginContent searchParams={searchParams} />
    </Suspense>
  );
}
