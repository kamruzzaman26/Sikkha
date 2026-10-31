import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/admin";
import { setCustomerStatus } from "./actions";

export const metadata: Metadata = {
  title: "ব্যবহারকারী পরিচালনা | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const messages: Record<string, string> = {
  active: "ব্যবহারকারী অ্যাকাউন্ট সক্রিয় করা হয়েছে।",
  suspended: "ব্যবহারকারী অ্যাকাউন্ট স্থগিত করা হয়েছে।",
  invalid: "তথ্য যাচাই করুন।",
  forbidden: "এই কাজের জন্য Admin অনুমতি প্রয়োজন।",
  "not-found": "ব্যবহারকারী পাওয়া যায়নি।",
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
  const users = (data ?? []) as UserSummary[];
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message =
    status && Object.hasOwn(messages, status) ? messages[status] : undefined;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin" className="font-semibold text-emerald-700">
            ← প্রশাসনিক প্যানেল
          </Link>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              লগআউট
            </button>
          </form>
        </div>
        <h1 className="mt-8 text-3xl font-extrabold">ব্যবহারকারী পরিচালনা</h1>
        <p className="mt-2 leading-7 text-slate-600">
          সর্বশেষ ৫০০টি অ্যাকাউন্ট। Admin ও অন্যান্য non-customer role এখানে
          পরিবর্তনযোগ্য নয়; affiliate membership আলাদা অনুমোদিত প্রক্রিয়ায়
          পরিচালিত হয়।
        </p>
        {message && (
          <p role="status" className="mt-5 rounded-lg bg-emerald-50 px-4 py-3">
            {message}
          </p>
        )}
        {users.length === 0 ? (
          <p className="mt-6 rounded-xl bg-white p-5 text-slate-600">
            কোনো ব্যবহারকারী পাওয়া যায়নি।
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
                        {user.display_name || "নাম দেওয়া হয়নি"}
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
                      অ্যাকাউন্ট: {user.account_status}
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
                            ? "অ্যাকাউন্ট স্থগিত করুন"
                            : "অ্যাকাউন্ট সক্রিয় করুন"}
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
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 sm:px-8 sm:py-14">
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
