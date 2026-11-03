import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/supabase/admin";
import { setStaffRole } from "./actions";

export const metadata: Metadata = {
  title: "Roles & Permissions | শিক্ষা নগরী প্রশাসন",
  robots: { index: false, follow: false },
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
};

const messages: Record<string, string> = {
  updated: "Role হালনাগাদ হয়েছে।",
  invalid: "তথ্য যাচাই করুন।",
  forbidden: "শুধু Super Admin role পরিবর্তন করতে পারেন।",
  rejected:
    "পরিবর্তন গ্রহণ করা হয়নি। শেষ Super Admin সরানো যায় না, আর শুধু Super Admin এটি করতে পারেন।",
};

async function RolesContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await connection();
  const { supabase } = await requirePermission(
    "manage_users",
    "/admin/dashboard",
  );

  const [usersResult, staffResult, permsResult, params] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.from("staff_roles").select("user_id, staff_role"),
    supabase.from("role_permissions").select("role, permission_key"),
    searchParams,
  ]);
  if (usersResult.error || staffResult.error || permsResult.error) {
    throw new Error("Unable to load roles.", {
      cause: usersResult.error ?? staffResult.error ?? permsResult.error,
    });
  }

  const staffByUser = new Map(
    (staffResult.data ?? []).map((row) => [row.user_id, row.staff_role]),
  );
  const admins = (
    (usersResult.data ?? []) as {
      user_id: string;
      email: string;
      display_name: string;
      access_role: string;
    }[]
  ).filter((user) => user.access_role === "admin");

  const permsByRole = new Map<string, string[]>();
  for (const row of permsResult.data ?? []) {
    permsByRole.set(row.role, [
      ...(permsByRole.get(row.role) ?? []),
      row.permission_key,
    ]);
  }

  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const message =
    status && Object.hasOwn(messages, status) ? messages[status] : undefined;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-extrabold">Roles & Permissions</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          বর্তমান অ্যাডমিনদের role। নতুন স্টাফ অ্যাকাউন্ট যোগ করা (বিশেষ করে
          Editor) পরবর্তী ধাপে আসবে — এখন শুধু বিদ্যমান অ্যাডমিনের role বদলানো
          যায়।
        </p>
        {message && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          >
            {message}
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {admins.map((admin) => {
            const current = staffByUser.get(admin.user_id) ?? null;
            return (
              <li
                key={admin.user_id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="font-semibold">
                  {admin.display_name || admin.email}
                </p>
                <p className="text-sm text-slate-600">{admin.email}</p>
                <p className="mt-1 text-sm text-slate-600">
                  বর্তমান role:{" "}
                  <strong>
                    {current ? roleLabels[current] : "নির্ধারিত নেই (Admin হিসেবে গণ্য)"}
                  </strong>
                </p>
                <form action={setStaffRole} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="userId" value={admin.user_id} />
                  <select
                    name="role"
                    defaultValue={current ?? "admin"}
                    aria-label="Role"
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="min-h-11 rounded-lg bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800"
                  >
                    সংরক্ষণ
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-10 text-lg font-bold">Role অনুযায়ী Permission</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {Object.entries(roleLabels).map(([role, label]) => (
            <div key={role} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-bold">{label}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {(permsByRole.get(role) ?? []).sort().map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-8">
          <div className="mx-auto h-64 max-w-5xl animate-pulse rounded-2xl bg-white" />
        </main>
      }
    >
      <RolesContent searchParams={searchParams} />
    </Suspense>
  );
}
