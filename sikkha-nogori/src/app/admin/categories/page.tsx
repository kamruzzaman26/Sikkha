import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "ক্যাটাগরি ব্যবস্থাপনা | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

type CategoryRow = {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  parent_id: string | null;
  category_group: "books" | "products" | "electronics";
  sort_order: number;
  is_active: boolean;
};

const groupLabels = {
  books: "বই",
  products: "সাধারণ পণ্য",
  electronics: "Electronics",
} as const;

export default async function AdminCategoriesPage() {
  await connection();
  const { supabase } = await requirePermission(
    "manage_categories",
    "/admin/dashboard",
  );
  const [{ data: categories, error }, { count: pendingCount, error: pendingError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id,name,name_en,slug,parent_id,category_group,sort_order,is_active")
        .order("category_group")
        .order("sort_order")
        .order("name"),
      supabase
        .from("category_import_sources")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "pending"),
    ]);

  if (error || pendingError) {
    throw new Error("ক্যাটাগরি তথ্য লোড করা যায়নি।", {
      cause: error ?? pendingError,
    });
  }

  const rows = (categories ?? []) as CategoryRow[];
  const children = new Map<string, CategoryRow[]>();
  const roots = rows.filter((row) => !row.parent_id);
  for (const row of rows) {
    if (row.parent_id) {
      const current = children.get(row.parent_id) ?? [];
      current.push(row);
      children.set(row.parent_id, current);
    }
  }

  const groupedRoots = (["books", "products", "electronics"] as const).map((group) => ({
    group,
    items: roots.filter((row) => row.category_group === group),
  }));

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
      <nav className="mb-5 text-sm text-slate-500">
        <Link href="/admin/dashboard" className="hover:text-emerald-700">Admin</Link>
        <span className="mx-2">/</span>
        <span>Categories</span>
      </nav>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-700">CATALOG CONTROL</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-950">ক্যাটাগরি ব্যবস্থাপনা</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Books, Products ও Electronics-এর Parent–Child কাঠামো। অজানা parent অনুমান করে বসানো হয় না।
          </p>
        </div>
        <Link href="/admin/dashboard" className="w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          Admin Dashboard
        </Link>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">মোট ক্যাটাগরি</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Root categories</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{roots.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">যাচাই বাকি source URL</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-amber-950">{pendingCount ?? 0}</p>
        </div>
      </section>

      <div className="mt-8 space-y-7">
        {groupedRoots.map(({ group, items }) => (
          <section key={group} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="font-bold text-slate-900">{groupLabels[group]} <span className="ml-2 text-xs font-medium text-slate-500">{items.length} root</span></h2>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">এখনো কোনো root category যোগ করা হয়নি।</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((root) => (
                  <li key={root.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{root.name}</p>
                        {root.name_en && <p className="text-xs text-slate-500">{root.name_en}</p>}
                        <p className="mt-1 text-xs text-slate-400">/{root.slug}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {(children.get(root.id) ?? []).length} subcategories
                      </span>
                    </div>
                    {(children.get(root.id) ?? []).length > 0 && (
                      <ul className="mt-3 grid gap-2 border-l-2 border-emerald-100 pl-4 sm:grid-cols-2">
                        {(children.get(root.id) ?? []).map((child) => (
                          <li key={child.id} className="text-sm text-slate-700">
                            {child.name}
                            {!child.is_active && <span className="ml-2 text-xs text-rose-600">Inactive</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="mt-8 rounded-lg bg-slate-50 p-4 text-xs leading-5 text-slate-500">
        এই পৃষ্ঠা taxonomy schema প্রস্তুত হলে category tree দেখাবে। Source URL import ও parent assignment এখনো migration চালানো এবং data review-এর অপেক্ষায়।
      </p>
    </main>
  );
}
