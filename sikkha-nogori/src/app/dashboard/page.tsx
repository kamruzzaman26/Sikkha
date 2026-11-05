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
  const [
    { data: profile, error: profileError },
    { data: contactProfile, error: contactError },
    { count, error: purchaseError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("customer_profiles")
      .select("phone")
      .eq("user_id", user.id)
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
  if (contactError) {
    throw new Error("Unable to load your contact information.", { cause: contactError });
  }
  if (purchaseError) {
    throw new Error("Unable to load your purchased products.", {
      cause: purchaseError,
    });
  }

  const contact = user.email || contactProfile?.phone || user.phone || "";

  return (
    <main className="min-h-screen bg-[#f5f8f6] px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-emerald-800">← শিক্ষা নগরী</Link>
          <form action={signOutCustomer}>
            <button type="submit" className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">লগআউট</button>
          </form>
        </div>
        <header className="mt-8 rounded-3xl bg-emerald-900 px-6 py-8 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Customer workspace</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            স্বাগতম{profile?.display_name ? `, ${profile.display_name}` : ""}
          </h1>
          <p className="mt-2 break-all text-sm text-emerald-100">{contact}</p>
        </header>
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/dashboard/purchases" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
            <p className="text-sm font-semibold text-emerald-700">ডিজিটাল লাইব্রেরি</p>
            <h2 className="mt-2 text-xl font-extrabold">আমার কেনা পণ্য</h2>
            <p className="mt-2 text-sm text-slate-600">সক্রিয় ডিজিটাল অ্যাক্সেস: {count ?? 0}</p>
          </Link>
          <Link href="/account/orders" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
            <p className="text-sm font-semibold text-emerald-700">Purchase history</p>
            <h2 className="mt-2 text-xl font-extrabold">অর্ডার ইতিহাস</h2>
            <p className="mt-2 text-sm text-slate-600">অর্ডারের অবস্থা ও পেমেন্ট যাচাই দেখুন।</p>
          </Link>
          <Link href="/dashboard/profile" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
            <p className="text-sm font-semibold text-emerald-700">Personal details</p>
            <h2 className="mt-2 text-xl font-extrabold">প্রোফাইল</h2>
            <p className="mt-2 text-sm text-slate-600">নিজের নাম ও যোগাযোগের তথ্য দেখুন।</p>
          </Link>
          <Link href="/affiliate" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
            <p className="text-sm font-semibold text-emerald-700">Partner program</p>
            <h2 className="mt-2 text-xl font-extrabold">অ্যাফিলিয়েট</h2>
            <p className="mt-2 text-sm text-slate-600">আবেদন করুন অথবা অনুমোদিত referral পরিসংখ্যান দেখুন।</p>
          </Link>
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f5f8f6] p-8"><div className="mx-auto max-w-5xl animate-pulse rounded-3xl bg-white p-8"><div className="h-8 w-64 rounded bg-slate-100" /><div className="mt-8 h-56 rounded-xl bg-slate-100" /></div></main>}>
      <DashboardContent />
    </Suspense>
  );
}
