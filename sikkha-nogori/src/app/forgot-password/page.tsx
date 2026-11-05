import Link from "next/link";

// This page uses request-specific query parameters and auth cookies.
export const instant = false;
import { requestPasswordReset, verifyPasswordResetOtp } from "./actions";

type PageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

const messages: Record<string, string> = {
  sent: "If an account exists for this email, a 6-digit reset code has been sent. Check your inbox and spam folder.",
  "invalid-email": "Please enter a valid email address.",
  "invalid-code": "Invalid pin code or password",
  error: "Something went wrong. Please try again.",
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message = status ? messages[status] : undefined;
  const showCodeForm = status === "sent" || status === "invalid-code";

  return (
    <main className="min-h-screen bg-[#f5f8f6] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm font-bold text-emerald-800">← Sikkha Nogori</Link>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-2xl" aria-hidden="true">✉</div>
          <h1 className="mt-5 text-center text-2xl font-black">Forgot Password</h1>
          <p className="mt-2 text-center text-sm leading-6 text-slate-600">Enter your email address to receive a 6-digit password reset code.</p>

          {message && (
            <p role={status === "sent" ? "status" : "alert"} className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${status === "sent" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
              {message}
            </p>
          )}

          {showCodeForm ? (
            <form action={verifyPasswordResetOtp} className="mt-6 grid gap-4">
              <div>
                <label htmlFor="reset-token" className="mb-2 block text-sm font-bold">Enter 6-digit code</label>
                <input id="reset-token" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-center text-xl tracking-[0.4em] outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
              </div>
              <button type="submit" className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-800">Verify Code</button>
              <Link href="/forgot-password" className="text-center text-sm font-semibold text-emerald-800 hover:underline">Use a different email address</Link>
            </form>
          ) : (
            <form action={requestPasswordReset} className="mt-6 grid gap-4">
              <div>
                <label htmlFor="reset-email" className="mb-2 block text-sm font-bold">Enter your email address</label>
                <input id="reset-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="name@example.com" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
              </div>
              <button type="submit" className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-800">Send Reset Link</button>
            </form>
          )}

          <p className="mt-6 text-center text-sm"><Link href="/login" className="font-bold text-emerald-800 hover:underline">Back to Login</Link></p>
        </section>
      </div>
    </main>
  );
}
