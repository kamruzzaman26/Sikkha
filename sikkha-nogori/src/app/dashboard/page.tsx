import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOutCustomer } from "@/app/login/actions";
import { requireCustomer } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "ড্যাশবোর্ড | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

async function DashboardContent() {
  const { supabase, user } = await requireCustomer();
  const [{ data: profile, error: profileError }, { count, error: purchaseError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("product_entitlements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

  if (profileError) {
    throw new Error("Unable to load your profile.", { cause: profileError });
  }
  if (purchaseError) {
    throw new Error("Unable to load your purchased products.", {
      cause: purchaseError,
    });
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-emerald-700">
            ← শিক্ষা নগরী
          </Link>
          <form action={signOutCustomer}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              লগআউট
            </button>
          </form>
        </div>
        <header className="mt-8">
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            স্বাগতম{profile?.display_name ? `, ${profile.display_name}` : ""}
          </h1>
          <p className="mt-2 break-all text-slate-600">{user.email}</p>
        </header>
        <nav aria-label="অ্যাকাউন্ট" className="mt-7 grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/purchases"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-500"
          >
            <h2 className="text-xl font-bold">আমার কেনা পণ্য</h2>
            <p className="mt-2 text-slate-600">
              সক্রিয় ডিজিটাল অ্যাক্সেস: {count ?? 0}
            </p>
          </Link>
          <Link
            href="/account/orders"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-500"
          >
            <h2 className="text-xl font-bold">অর্ডার ইতিহাস</h2>
            <p className="mt-2 text-slate-600">
              অর্ডারের অবস্থা ও পেমেন্ট যাচাই দেখুন।
            </p>
          </Link>
          <Link
            href="/dashboard/profile"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-500"
          >
            <h2 className="text-xl font-bold">প্রোফাইল</h2>
            <p className="mt-2 text-slate-600">নিজের নাম হালনাগাদ করুন।</p>
          </Link>
          <Link
            href="/affiliate"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-500"
          >
            <h2 className="text-xl font-bold">অ্যাফিলিয়েট</h2>
            <p className="mt-2 text-slate-600">
              আবেদন করুন অথবা অনুমোদিত referral পরিসংখ্যান দেখুন।
            </p>
          </Link>
        </nav>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-4xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
