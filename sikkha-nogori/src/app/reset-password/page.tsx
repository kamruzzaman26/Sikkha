import Link from "next/link";

// This page uses request-specific query parameters and auth cookies.
export const instant = false;
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateCustomerPassword } from "./actions";

type PageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

const messages: Record<string, string> = {
  weak: "Password must be at least 8 characters long.",
  mismatch: "Passwords do not match. Please try again.",
  error: "Something went wrong. Please try again.",
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message = status ? messages[status] : undefined;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[#f5f8f6] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm font-bold text-emerald-800">← Sikkha Nogori</Link>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-center text-2xl font-black">Reset Password</h1>
          <p className="mt-2 text-center text-sm leading-6 text-slate-600">Enter a new password for your account.</p>
          {message && <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">{message}</p>}
          {user ? (
            <form action={updateCustomerPassword} className="mt-6 grid gap-4">
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-bold">New Password</label>
                <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold">Confirm Password</label>
                <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
              </div>
              <p className="text-xs text-slate-500">Use a password with at least 8 characters.</p>
              <button type="submit" className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-800">Update Password</button>
            </form>
          ) : (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Invalid pin code or password
              <Link href="/forgot-password" className="mt-3 block font-bold text-emerald-800 underline">Request a new code</Link>
            </div>
          )}
          <p className="mt-6 text-center text-sm"><Link href="/login" className="font-bold text-emerald-800 hover:underline">Back to Login</Link></p>
        </section>
      </div>
    </main>
  );
}
