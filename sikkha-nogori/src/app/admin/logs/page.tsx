import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePermission } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Activity Logs | শিক্ষা নগরী প্রশাসন",
  robots: { index: false, follow: false },
};

const actionLabels: Record<string, string> = {
  product_created: "পণ্য তৈরি",
  product_updated: "পণ্য পরিবর্তন",
  product_archived: "পণ্য আর্কাইভ",
  product_restored: "পণ্য পুনরুদ্ধার",
  order_status_changed: "অর্ডারের স্ট্যাটাস পরিবর্তন",
  payment_reviewed: "পেমেন্ট যাচাই",
  order_refund_recorded: "রিফান্ড রেকর্ড",
  customer_status_changed: "গ্রাহকের অ্যাকাউন্ট স্ট্যাটাস পরিবর্তন",
  staff_role_changed: "স্টাফ role পরিবর্তন",
};

const dateFormat = new Intl.DateTimeFormat("bn-BD", {
  timeZone: "Asia/Dhaka",
  dateStyle: "medium",
  timeStyle: "short",
});

async function LogsContent() {
  await connection();
  const { supabase } = await requirePermission(
    "view_activity_logs",
    "/admin/dashboard",
  );

  const { data: logs, error } = await supabase
    .from("activity_logs")
    .select("id, actor_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error("Unable to load activity logs.", { cause: error });
  }

  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))];
  const emailById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: users } = await supabase.rpc("admin_list_users");
    for (const user of (users ?? []) as { user_id: string; email: string }[]) {
      emailById.set(user.user_id, user.email);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-extrabold">Activity Logs</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          সর্বশেষ ২০০টি প্রশাসনিক কাজ। লগ শুধু যোগ হয়; বদলানো বা মোছা যায় না।
          এই লগ চালুর আগের কাজ এখানে নেই।
        </p>
        {(logs ?? []).length === 0 ? (
          <p className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
            এখনো কোনো কাজ লগ হয়নি।
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">সময়</th>
                  <th className="px-4 py-3 font-semibold">কে</th>
                  <th className="px-4 py-3 font-semibold">কাজ</th>
                  <th className="px-4 py-3 font-semibold">লক্ষ্য</th>
                  <th className="px-4 py-3 font-semibold">বিবরণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(logs ?? []).map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      {dateFormat.format(new Date(log.created_at))}
                    </td>
                    <td className="px-4 py-3">
                      {(log.actor_id && emailById.get(log.actor_id)) || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {actionLabels[log.action] ?? log.action}
                    </td>
                    <td className="break-all px-4 py-3 text-slate-600">
                      {log.target_type}: {log.target_id}
                    </td>
                    <td className="break-all px-4 py-3 text-slate-600">
                      {Object.keys(log.details ?? {}).length > 0
                        ? JSON.stringify(log.details)
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminLogsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-8">
          <div className="mx-auto h-64 max-w-6xl animate-pulse rounded-2xl bg-white" />
        </main>
      }
    >
      <LogsContent />
    </Suspense>
  );
}
