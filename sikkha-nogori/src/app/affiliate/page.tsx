import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { applyForAffiliate } from "./actions";
import { requireCustomer } from "@/lib/supabase/auth";
import { formatBDT } from "@/lib/money";

export const metadata: Metadata = {
  title: "অ্যাফিলিয়েট | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const messages = {
  "already-applied": "আপনার আবেদনটি আগে থেকেই আছে।",
  "application-submitted": "আপনার আবেদন জমা হয়েছে; অনুমোদনের জন্য অপেক্ষা করুন।",
} as const;

async function AffiliateContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { supabase, user } = await requireCustomer();
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message =
    status && Object.hasOwn(messages, status)
      ? messages[status as keyof typeof messages]
      : undefined;
  const [
    { data: application, error: applicationError },
    { data: affiliate, error: affiliateError },
  ] = await Promise.all([
    supabase
      .from("affiliate_applications")
      .select("status, created_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("affiliate_accounts")
      .select("referral_code, status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (applicationError) {
    throw new Error("Unable to load your affiliate application.", {
      cause: applicationError,
    });
  }
  if (affiliateError) {
    throw new Error("Unable to verify affiliate access.", {
      cause: affiliateError,
    });
  }

  const isActive = affiliate?.status === "active";
  const [referralsResult, statsResult] = isActive
    ? await Promise.all([
        supabase
          .from("affiliate_order_referrals")
          .select("order_id, order_total, status, created_at")
          .eq("affiliate_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.rpc("get_my_affiliate_stats"),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (referralsResult.error) {
    throw new Error("Unable to load your referral statistics.", {
      cause: referralsResult.error,
    });
  }
  if (statsResult.error) {
    throw new Error("Unable to load your affiliate totals.", {
      cause: statsResult.error,
    });
  }
  const referrals = referralsResult.data;
  const stats = statsResult.data?.[0];
  const convertedCount = Number(stats?.converted_count ?? 0);
  const totalConverted = Number(stats?.converted_total ?? 0);
  const siteUrlValue = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (isActive && !siteUrlValue) {
    throw new Error("Set NEXT_PUBLIC_SITE_URL to the public site origin.");
  }
  let referralLink = "";
  if (isActive && affiliate && siteUrlValue) {
    let siteUrl: URL;
    try {
      siteUrl = new URL(siteUrlValue);
    } catch (error) {
      throw new Error("NEXT_PUBLIC_SITE_URL must be a valid site origin.", {
        cause: error,
      });
    }
    if (
      !["http:", "https:"].includes(siteUrl.protocol) ||
      siteUrl.username ||
      siteUrl.password ||
      siteUrl.pathname !== "/" ||
      siteUrl.search ||
      siteUrl.hash ||
      (process.env.NODE_ENV === "production" && siteUrl.protocol !== "https:")
    ) {
      throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin.");
    }
    referralLink = new URL(`/r/${affiliate.referral_code}`, siteUrl).toString();
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="font-semibold text-emerald-700">
          ← ড্যাশবোর্ড
        </Link>
        <h1 className="mt-8 text-3xl font-extrabold">অ্যাফিলিয়েট</h1>
        <p className="mt-2 leading-7 text-slate-600">
          অ্যাফিলিয়েট সুবিধা আলাদা অনুমোদনের মাধ্যমে সক্রিয় হয়; গ্রাহক অ্যাকাউন্টের
          সাধারণ সুবিধা এর জন্য অপেক্ষা করে না।
        </p>
        {message && (
          <p role="status" className="mt-5 rounded-lg bg-emerald-50 px-4 py-3">
            {message}
          </p>
        )}

        {isActive && affiliate ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">আপনার অনুমোদিত referral link</h2>
            <p className="mt-2 text-sm text-slate-600">
              কোড: <code className="font-bold">{affiliate.referral_code}</code>
            </p>
            <a
              href={referralLink}
              className="mt-1 block break-all rounded-lg bg-slate-50 p-3 font-mono text-sm text-emerald-800 underline"
            >
              {referralLink}
            </a>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              যাচাইকৃত অর্ডারের পরিসংখ্যান দেখানো হয়। কমিশনের হার বা payout এই
              সিস্টেমে নির্ধারিত নয়।
            </p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 p-4">
                <dt className="text-sm text-emerald-900">যাচাইকৃত অর্ডার</dt>
                <dd className="mt-1 text-2xl font-extrabold">{convertedCount}</dd>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <dt className="text-sm text-emerald-900">
                  যাচাইকৃত অর্ডারের মোট মূল্য
                </dt>
                <dd className="mt-1 text-2xl font-extrabold">
                  {formatBDT(totalConverted)}
                </dd>
              </div>
            </dl>
            <h3 className="mt-6 font-bold">সাম্প্রতিক referral অর্ডার</h3>
            {referrals.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">এখনো কোনো referral নেই।</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {referrals.slice(0, 20).map((referral) => (
                  <li
                    key={referral.order_id}
                    className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                  >
                    <span>অর্ডার · {referral.order_id.slice(0, 8)}</span>
                    <span>
                      {referral.status === "converted"
                        ? "পেমেন্ট যাচাইকৃত"
                        : referral.status === "void"
                          ? "বাতিল"
                          : "অপেক্ষমাণ"}
                    </span>
                    <span>{formatBDT(Number(referral.order_total))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : application?.status === "pending" ? (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            আপনার আবেদন পর্যালোচনাধীন। এই সময়ে আপনি গ্রাহক হিসেবে অর্ডার ও প্রোফাইল
            ব্যবহার করতে পারবেন।
          </p>
        ) : application?.status === "rejected" ? (
          <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
            আপনার অ্যাফিলিয়েট আবেদন অনুমোদিত হয়নি। গ্রাহক সুবিধা স্বাভাবিকভাবে
            ব্যবহার করতে পারবেন।
          </p>
        ) : (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">অ্যাফিলিয়েট হওয়ার আবেদন</h2>
            <p className="mt-2 leading-7 text-slate-600">
              আবেদন জমা দিলে প্রশাসক পর্যালোচনা করবেন। অনুমোদন না হওয়া পর্যন্ত কোনো
              referral link বা affiliate permission দেওয়া হবে না।
            </p>
            <form action={applyForAffiliate} className="mt-5">
              <button
                type="submit"
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800"
              >
                আবেদন জমা দিন
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

export default function AffiliatePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-4xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-56 rounded bg-slate-100" />
            <div className="mt-8 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <AffiliateContent searchParams={searchParams} />
    </Suspense>
  );
}
