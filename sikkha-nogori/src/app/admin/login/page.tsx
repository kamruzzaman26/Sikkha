import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { loginAdmin } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Admin Login | Sikkha Nogori",
  robots: { index: false, follow: false },
};

const loginMessages: Record<string, string> = {
  invalid: "The email or password is incorrect.",
  unauthorized: "This account is not authorized as an administrator.",
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
    <main lang="en" className="flex min-h-screen items-center justify-center bg-[#edf4f1] px-5 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-[28px] border border-white bg-white p-7 shadow-[0_24px_70px_-35px_rgba(7,60,50,0.35)] sm:p-9">
        <Link href="/" className="font-semibold text-emerald-700">
          ← Back to Sikkha Nogori
        </Link>

        <p className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">
          ADMIN PORTAL
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Administrator Sign In</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Sign in with an authorized administrator account.
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
              Email address
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
              Password
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
            className="mt-2 min-h-12 rounded-xl bg-[#0a5748] px-4 py-3 font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#073c32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Sign in
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
