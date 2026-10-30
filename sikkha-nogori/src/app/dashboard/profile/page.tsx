import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { updateCustomerProfile } from "./actions";
import { requireCustomer } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "আমার প্রোফাইল | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const messages = {
  invalid: "নাম বা ফোন নম্বর যাচাই করুন।",
  saved: "আপনার প্রোফাইল হালনাগাদ হয়েছে।",
} as const;

async function ProfileContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { supabase, user } = await requireCustomer();
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const { data: profile, error } = await supabase
    .from("customer_profiles")
    .select("display_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load your profile.", { cause: error });
  }

  const message =
    status && Object.hasOwn(messages, status)
      ? messages[status as keyof typeof messages]
      : undefined;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/dashboard" className="font-semibold text-emerald-700">
          ← ড্যাশবোর্ড
        </Link>
        <h1 className="mt-8 text-3xl font-extrabold">আমার প্রোফাইল</h1>
        <p className="mt-2 break-all text-slate-600">{user.email}</p>
        {message && (
          <p role="status" className="mt-5 rounded-lg bg-emerald-50 px-4 py-3">
            {message}
          </p>
        )}
        <form action={updateCustomerProfile} className="mt-6 grid gap-4">
          <div>
            <label htmlFor="profile-name" className="mb-2 block font-semibold">
              নাম
            </label>
            <input
              id="profile-name"
              name="displayName"
              maxLength={100}
              defaultValue={profile?.display_name ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="mb-2 block font-semibold">
              ফোন নম্বর
            </label>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={25}
              defaultValue={profile?.phone ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </div>
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800"
          >
            সংরক্ষণ করুন
          </button>
        </form>
      </section>
    </main>
  );
}

export default function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-2xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <ProfileContent searchParams={searchParams} />
    </Suspense>
  );
}
