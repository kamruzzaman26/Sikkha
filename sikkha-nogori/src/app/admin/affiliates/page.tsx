import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/admin";
import { reviewAffiliate } from "./actions";

export const metadata: Metadata = {
  title: "Affiliate Accounts | Sikkha Nogori",
  robots: { index: false, follow: false },
};

const messages: Record<string, string> = {
  approved: "Affiliate application approved.",
  rejected: "Affiliate application rejected.",
  suspended: "Affiliate account suspended.",
  invalid: "Please verify the submitted information.",
  forbidden: "Administrator permission is required for this action.",
  "not-found": "Application not found.",
};

const badgeStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-green-100 text-green-800",
  active: "bg-green-100 text-green-800",
  rejected: "bg-rose-100 text-rose-900",
  suspended: "bg-rose-100 text-rose-900",
};

function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold capitalize ${
        badgeStyles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

async function AdminAffiliatesContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await connection();
  const { supabase, role } = await requireAdmin("admin");
  if (role !== "admin") {
    notFound();
  }

  const [{ data: applications, error: applicationsError }, { data: accounts, error: accountsError }] =
    await Promise.all([
      supabase
        .from("affiliate_applications")
        .select("user_id, status, created_at, reviewed_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("affiliate_accounts")
        .select("user_id, referral_code, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  if (applicationsError) {
    throw new Error("Unable to load affiliate applications.", {
      cause: applicationsError,
    });
  }
  if (accountsError) {
    throw new Error("Unable to load affiliate accounts.", {
      cause: accountsError,
    });
  }

  const userIds = [...new Set(applications.map((entry) => entry.user_id))];
  const { data: profiles, error: profilesError } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds)
      : { data: [], error: null };
  if (profilesError) {
    throw new Error("Unable to load affiliate applicant profiles.", {
      cause: profilesError,
    });
  }
  const displayNames = new Map(
    profiles.map((profile) => [profile.id, profile.display_name]),
  );
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message =
    status && Object.hasOwn(messages, status) ? messages[status] : undefined;
  const pendingCount = applications.filter((a) => a.status === "pending").length;

  return (
    <main lang="en" className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">System administration</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Affiliate accounts</h1>
            <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-slate-600">
              Approving an application creates affiliate membership only. It never grants an admin role.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Open product catalog
            </Link>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        {message && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900"
          >
            {message}
          </p>
        )}

        <section aria-label="Summary" className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Applications</p>
            <p className="mt-3 text-3xl font-bold tabular-nums">{applications.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Waiting for review</p>
            <p className="mt-3 text-3xl font-bold tabular-nums">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Affiliate accounts</p>
            <p className="mt-3 text-3xl font-bold tabular-nums">{accounts.length}</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 className="text-lg font-bold tracking-tight">Applications</h2>
            <p className="mt-0.5 text-sm text-slate-600">Newest first. Only pending applications can be reviewed.</p>
          </div>
          {applications.length === 0 ? (
            <div className="m-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 sm:m-6">
              No applications found.
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {applications.map((application) => (
                <li
                  key={application.user_id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-semibold text-slate-900">
                        {displayNames.get(application.user_id) || "Name not provided"}
                      </p>
                      <Badge status={application.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Applied {new Date(application.created_at).toLocaleString("en-GB")}
                    </p>
                    <p className="mt-0.5 break-all font-mono text-xs text-slate-500">{application.user_id}</p>
                  </div>
                  {application.status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      <form action={reviewAffiliate}>
                        <input type="hidden" name="userId" value={application.user_id} />
                        <input type="hidden" name="status" value="approved" />
                        <button
                          type="submit"
                          className="min-h-11 rounded-xl bg-brand-800 px-5 text-sm font-semibold text-white transition hover:bg-brand-900"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={reviewAffiliate}>
                        <input type="hidden" name="userId" value={application.user_id} />
                        <input type="hidden" name="status" value="rejected" />
                        <button
                          type="submit"
                          className="min-h-11 rounded-xl border border-rose-300 bg-white px-5 text-sm font-semibold text-rose-800 transition hover:bg-rose-50"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <h2 className="text-lg font-bold tracking-tight">Active and suspended accounts</h2>
          </div>
          {accounts.length === 0 ? (
            <div className="m-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 sm:m-6">
              No affiliate accounts yet.
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {accounts.map((account) => (
                <li
                  key={account.user_id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        Code{" "}
                        <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm">
                          {account.referral_code}
                        </code>
                      </p>
                      <Badge status={account.status} />
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">{account.user_id}</p>
                  </div>
                  <form action={reviewAffiliate}>
                    <input type="hidden" name="userId" value={account.user_id} />
                    <input
                      type="hidden"
                      name="status"
                      value={account.status === "active" ? "suspended" : "approved"}
                    />
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      {account.status === "active" ? "Suspend" : "Reactivate"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <main lang="en" className="min-h-screen bg-[#f4f6fa] px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-5xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <AdminAffiliatesContent searchParams={searchParams} />
    </Suspense>
  );
}
