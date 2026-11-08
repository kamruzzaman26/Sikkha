import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/admin";
import { setCustomerStatus } from "./actions";

export const metadata: Metadata = {
  title: "User Management | Sikkha Nogori",
  robots: { index: false, follow: false },
};

const messages: Record<string, string> = {
  active: "User account activated.",
  suspended: "User account suspended.",
  invalid: "Please verify the information.",
  forbidden: "Administrator permission is required for this action.",
  "not-found": "User not found.",
};

type UserSummary = {
  user_id: string;
  email: string;
  display_name: string;
  phone: string;
  account_status: "active" | "suspended";
  access_role: string;
};

async function AdminUsersContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await connection();
  const { supabase, role } = await requireAdmin("admin");
  if (role !== "admin") {
    notFound();
  }

  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) {
    throw new Error("Unable to load users for administration.", {
      cause: error,
    });
  }
  const allUsers = (data ?? []) as UserSummary[];
  const users = allUsers.filter((user) => ["user", "customer"].includes(user.access_role));
  const staffUsers = allUsers.filter((user) => !["user", "customer"].includes(user.access_role));
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message =
    status && Object.hasOwn(messages, status) ? messages[status] : undefined;

  return (
    <main lang="en" className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Daily operations</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Customer Management</h1>
            <p className="mt-1.5 max-w-3xl text-[15px] leading-6 text-slate-600">Latest 500 accounts. Admin and other non-customer roles cannot be modified here. Affiliate membership is managed through a separate approval workflow.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/admin/dashboard" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">Dashboard</Link>
            <form action={logoutAdmin}>
              <button type="submit" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">Sign out</button>
            </form>
          </div>
        </header>
        {message && (
          <p role="status" className="mt-5 rounded-lg bg-brand-50 px-4 py-3">
            {message}
          </p>
        )}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold">Admins & Staff ({staffUsers.length})</h2>
          {staffUsers.length === 0 ? <p className="mt-3 text-sm text-slate-500">No staff accounts found.</p> : (
            <ul className="mt-3 divide-y divide-slate-100">
              {staffUsers.map((staff) => <li key={staff.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-semibold">{staff.display_name || "Name not provided"}</p><p className="text-sm text-slate-600">{staff.email}</p></div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">{staff.access_role}</span>
              </li>)}
            </ul>
          )}
        </section>
        <h2 className="mt-7 text-xl font-extrabold">Customers ({users.length})</h2>
        {users.length === 0 ? (
          <p className="mt-6 rounded-xl bg-white p-5 text-slate-600">
            No users found.
          </p>
        ) : (
          <ul className="mt-6 grid gap-3">
            {users.map((user) => {
              const canChangeStatus =
                user.access_role === "user" || user.access_role === "customer";
              return (
                <li
                  key={user.user_id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold">
                        {user.display_name || "Name not provided"}
                      </h2>
                      <p className="mt-1 break-all text-sm text-slate-600">
                        {user.email}
                      </p>
                      {user.phone && (
                        <p className="mt-1 text-sm text-slate-600">{user.phone}</p>
                      )}
                      <p className="mt-2 break-all text-xs text-slate-500">
                        User ID: {user.user_id}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
                      {user.access_role}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="text-sm text-slate-700">
                      Account: {user.account_status}
                    </span>
                    {canChangeStatus && (
                      <form action={setCustomerStatus}>
                        <input type="hidden" name="userId" value={user.user_id} />
                        <input
                          type="hidden"
                          name="status"
                          value={
                            user.account_status === "active"
                              ? "suspended"
                              : "active"
                          }
                        />
                        <button
                          type="submit"
                          className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50"
                        >
                          {user.account_status === "active"
                            ? "Suspend Account"
                            : "Activate Account"}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <main lang="en" className="min-h-screen bg-[#f4f6fa] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-5xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <AdminUsersContent searchParams={searchParams} />
    </Suspense>
  );
}
