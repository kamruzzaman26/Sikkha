import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { logoutAdmin } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "অ্যাডমিন ড্যাশবোর্ড | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

function number(value: number | null) {
  return new Intl.NumberFormat("bn-BD").format(value ?? 0);
}

function MetricCard({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: number | null;
  note: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
        {number(value)}
      </p>
      <p className="mt-2 text-xs font-medium text-slate-500">{note}</p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  await connection();
  const { supabase } = await requireAdmin("admin");

  const [
    products,
    publishedProducts,
    orders,
    submittedPayments,
    customers,
    affiliates,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .is("archived_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase
      .from("order_payment_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase
      .from("customer_profiles")
      .select("user_id", { count: "exact", head: true }),
    supabase
      .from("affiliate_accounts")
      .select("user_id", { count: "exact", head: true }),
  ]);

  const firstError = [
    products.error,
    publishedProducts.error,
    orders.error,
    submittedPayments.error,
    customers.error,
    affiliates.error,
  ].find(Boolean);

  if (firstError) {
    throw new Error("Unable to load the admin dashboard summary.", {
      cause: firstError,
    });
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-700">শিক্ষা নগরী · প্রশাসন</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              অ্যাডমিন ড্যাশবোর্ড
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              আপনার মার্কেটপ্লেসের পণ্য, অর্ডার, পেমেন্ট ও গ্রাহক কার্যক্রম এক জায়গায় দেখুন।
            </p>
          </div>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              লগআউট
            </button>
          </form>
        </div>

        <section aria-label="সারসংক্ষেপ" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="মোট পণ্য"
            value={products.count}
            note={`${number(publishedProducts.count)}টি প্রকাশিত ও আর্কাইভবিহীন`}
            href="/admin"
          />
          <MetricCard
            label="মোট অর্ডার"
            value={orders.count}
            note="অর্ডার তালিকা ও অবস্থা পরিচালনা"
            href="/admin/orders"
          />
          <MetricCard
            label="যাচাই অপেক্ষমাণ পেমেন্ট"
            value={submittedPayments.count}
            note="গ্রাহকের জমা দেওয়া পেমেন্ট রেফারেন্স"
            href="/admin/orders"
          />
          <MetricCard
            label="গ্রাহক প্রোফাইল"
            value={customers.count}
            note="গ্রাহক অ্যাকাউন্ট পরিচালনা"
            href="/admin/users"
          />
          <MetricCard
            label="অ্যাফিলিয়েট অ্যাকাউন্ট"
            value={affiliates.count}
            note="অ্যাফিলিয়েট আবেদন ও সদস্য"
            href="/admin/affiliates"
          />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-bold">দ্রুত কাজ</h2>
            <p className="mt-1 text-sm text-slate-500">প্রয়োজনীয় ব্যবস্থাপনা পেজে সরাসরি যান।</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { href: "/admin", title: "পণ্য ও ক্যাটালগ", description: "নতুন পণ্য যোগ, সম্পাদনা ও প্রকাশ" },
              { href: "/admin/orders", title: "অর্ডার পরিচালনা", description: "অর্ডার, পেমেন্ট যাচাই ও রিফান্ড" },
              { href: "/admin/payments", title: "পেমেন্ট পদ্ধতি", description: "ম্যানুয়াল পেমেন্ট ও COD সেটিংস" },
              { href: "/admin/affiliates", title: "অ্যাফিলিয়েট", description: "আবেদন অনুমোদন ও অ্যাকাউন্ট" },
              { href: "/admin/users", title: "গ্রাহক ব্যবস্থাপনা", description: "গ্রাহকের অ্যাকাউন্ট অবস্থা" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
              >
                <p className="font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                <span className="mt-3 inline-block text-sm font-bold text-emerald-700">খুলুন →</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
