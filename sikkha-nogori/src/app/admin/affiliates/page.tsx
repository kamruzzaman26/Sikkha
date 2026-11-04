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

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin" className="font-semibold text-emerald-700">
            ← Admin workspace
          </Link>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              Sign out
            </button>
          </form>
        </div>
        <h1 className="mt-8 text-3xl font-extrabold">Affiliate Accounts</h1>
        <p className="mt-2 leading-7 text-slate-600">
          Approving an application creates affiliate membership only. It never grants an admin role.
        </p>
        {message && (
          <p role="status" className="mt-5 rounded-lg bg-emerald-50 px-4 py-3">
            {message}
          </p>
        )}

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Applications · {applications.length}</h2>
          {applications.length === 0 ? (
            <p className="mt-3 text-slate-600">No applications found.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {applications.map((application) => (
                <li
                  key={application.user_id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="break-all font-semibold">
                    {displayNames.get(application.user_id) || "Name not provided"}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    User ID: {application.user_id}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Status: {application.status}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Application:{" "}
                    {new Date(application.created_at).toLocaleString("bn-BD")}
                  </p>
                  {application.status === "pending" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={reviewAffiliate}>
                        <input
                          type="hidden"
                          name="userId"
                          value={application.user_id}
                        />
                        <input type="hidden" name="status" value="approved" />
                        <button
                          type="submit"
                          className="min-h-10 rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={reviewAffiliate}>
                        <input
                          type="hidden"
                          name="userId"
                          value={application.user_id}
                        />
                        <input type="hidden" name="status" value="rejected" />
                        <button
                          type="submit"
                          className="min-h-10 rounded-lg border border-rose-700 px-4 py-2 font-bold text-rose-800"
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

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Active & Suspended Accounts</h2>
          {accounts.length === 0 ? (
            <p className="mt-3 text-slate-600">No affiliate accounts yet.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {accounts.map((account) => (
                <li
                  key={account.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold">
                      Code: <code>{account.referral_code}</code>
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      User ID: {account.user_id} · {account.status}
                    </p>
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
                      className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50"
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
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
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
