import Link from "next/link";

// These account-recovery pages depend on request-specific search parameters and auth cookies.
export const instant = false;
import { requestPasswordReset } from "./actions";

type PageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

const messages: Record<string, string> = {
  sent: "যদি এই ইমেইল দিয়ে অ্যাকাউন্ট থাকে, তাহলে পাসওয়ার্ড রিসেটের লিংক পাঠানো হয়েছে। ইনবক্স ও Spam ফোল্ডার দেখুন।",
  invalid: "সঠিক ইমেইল ঠিকানা লিখুন।",
  error: "এখন রিসেট লিংক পাঠানো যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।",
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message = status ? messages[status] : undefined;
  const isSent = status === "sent";

  return (
    <main className="min-h-screen bg-[#f5f8f6] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm font-bold text-emerald-800">← শিক্ষা নগরী</Link>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-2xl" aria-hidden="true">✉</div>
          <h1 className="mt-5 text-center text-2xl font-black">পাসওয়ার্ড ভুলে গেছেন?</h1>
          <p className="mt-2 text-center text-sm leading-6 text-slate-600">আপনার অ্যাকাউন্টের ইমেইল ঠিকানা লিখুন। আমরা পাসওয়ার্ড রিসেট করার লিংক পাঠাব।</p>
          {message && (
            <p role={isSent ? "status" : "alert"} className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${isSent ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
              {message}
            </p>
          )}
          {!isSent && (
            <form action={requestPasswordReset} className="mt-6 grid gap-4">
              <div>
                <label htmlFor="reset-email" className="mb-2 block text-sm font-bold">ইমেইল ঠিকানা</label>
                <input id="reset-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="name@example.com" className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
              </div>
              <button type="submit" className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-800">রিসেট লিংক পাঠান</button>
            </form>
          )}
          <p className="mt-6 text-center text-sm"><Link href="/login" className="font-bold text-emerald-800 hover:underline">লগইন পেজে ফিরে যান</Link></p>
        </section>
      </div>
    </main>
  );
}
