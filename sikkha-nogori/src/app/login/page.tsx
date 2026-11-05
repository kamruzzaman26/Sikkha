import Link from "next/link";
import { Suspense } from "react";
import { signInCustomer, signUpCustomer } from "./actions";
import { SubmitButton } from "@/components/submit-button";

const statusMessages: Record<string, string> = {
  invalid: "Check your email or mobile number and password, then try again.",
  "signup-failed": "We couldn't create your account. Check your details and try again.",
  "phone-signup-unavailable": "Phone registration is not available yet. Please contact the administrator.",
  "check-email": "Enter the 6-digit verification code sent to your email.",
  "signed-out": "You have been signed out securely.",
  "sign-in-required": "Please sign in to continue.",
  suspended: "This account is suspended. Please contact the administrator.",
  "confirmation-failed": "Verification failed. Request a new code and try again.",
  "password-updated": "Password updated successfully.",
};

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message = status ? statusMessages[status] : undefined;

  return (
    <main className="min-h-screen bg-[#f5f8f6] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800"><span aria-hidden="true">←</span> Sikkha Nogori</Link>
        <header className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Customer Account</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Start Your Learning Journey</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">Manage your orders, digital purchases, and profile from one account.</p>
        </header>
        {message && <p role="status" className="mx-auto mt-6 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{message}</p>}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-xl" aria-hidden="true">↪</span><div><h2 className="text-xl font-extrabold">Sign In</h2><p className="mt-1 text-sm text-slate-500">Access your existing account</p></div></div>
            <form action={signInCustomer} className="mt-6 grid gap-4">
              <div><label htmlFor="signin-identifier" className="mb-2 block text-sm font-bold">Email Address or Mobile Number</label><input id="signin-identifier" name="identifier" type="text" autoComplete="username" placeholder="name@example.com / 01XXXXXXXXX" required maxLength={254} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></div>
              <div><label htmlFor="signin-password" className="mb-2 block text-sm font-bold">Password</label><input id="signin-password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required maxLength={128} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></div>
              <SubmitButton pendingLabel="Signing in..." className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-800">Sign In</SubmitButton>
            </form>
            <p className="mt-4 text-right text-sm"><Link href="/forgot-password" className="font-bold text-emerald-800 hover:underline">Forgot Password?</Link></p>
            <p className="mt-5 text-center text-xs leading-6 text-slate-500">To sign in with a mobile number, it must already be verified with Supabase Phone Auth.</p>
          </section>
          <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-xl" aria-hidden="true">＋</span><div><h2 className="text-xl font-extrabold">Create an Account</h2><p className="mt-1 text-sm text-slate-500">Register with your email or mobile number</p></div></div>
            <form action={signUpCustomer} className="mt-6 grid gap-4">
              <div><label htmlFor="signup-name" className="mb-2 block text-sm font-bold">Full Name</label><input id="signup-name" name="displayName" autoComplete="name" placeholder="Enter your full name" required maxLength={100} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /></div>
              <div><label htmlFor="signup-identifier" className="mb-2 block text-sm font-bold">Email Address or Mobile Number</label><input id="signup-identifier" name="identifier" type="text" autoComplete="username" placeholder="name@example.com / 01XXXXXXXXX" required maxLength={254} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /><p className="mt-1.5 text-xs text-slate-500">Bangladesh: 01XXXXXXXXX or international format: +8801XXXXXXXXX</p></div>
              <div><label htmlFor="signup-password" className="mb-2 block text-sm font-bold">Password</label><input id="signup-password" name="password" type="password" autoComplete="new-password" placeholder="Create a password" required minLength={8} maxLength={128} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" /><p className="mt-1.5 text-xs text-slate-500">Use at least 8 characters.</p></div>
              <SubmitButton pendingLabel="Creating account..." className="min-h-12 rounded-xl border border-emerald-700 bg-emerald-50 px-5 font-bold text-emerald-900 transition hover:bg-emerald-100">Create Account</SubmitButton>
            </form>
            <p className="mt-4 text-center text-xs leading-6 text-slate-500">Email registration may require a 6-digit email OTP. Mobile registration may require an SMS OTP.</p>
          </section>
        </div>
        <p className="mt-7 text-center text-xs text-slate-500">Your account information is stored securely.</p>
      </div>
    </main>
  );
}

export default function LoginPage({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  return <Suspense fallback={<main className="min-h-screen bg-[#f5f8f6] p-8"><div className="mx-auto max-w-4xl animate-pulse rounded-3xl bg-white p-8"><div className="h-8 w-64 rounded bg-slate-100" /><div className="mt-8 h-64 rounded-xl bg-slate-100" /></div></main>}><LoginContent searchParams={searchParams} /></Suspense>;
}
