import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { bulkAddCategories, deleteCategory, saveCategory } from "./actions";

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

const messages: Record<string, string> = {
  updated: "ক্যাটাগরি হালনাগাদ হয়েছে।",
  deleted: "ক্যাটাগরি মোছা হয়েছে।",
  invalid: "তথ্য যাচাই করুন (নাম, slug ও ক্রম)।",
  "slug-exists": "এই slug এই গ্রুপে আগে থেকেই আছে।",
  "invalid-parent":
    "Parent বৈধ নয়: একই গ্রুপের হতে হবে, নিজের বা নিজের সাবক্যাটাগরির ভেতরে বসানো যাবে না।",
  "in-use":
    "মোছা যাবে না: এর সাবক্যাটাগরি বা সংযুক্ত পণ্য আছে। চাইলে নিষ্ক্রিয় করুন।",
  "not-found": "ক্যাটাগরি পাওয়া যায়নি।",
  forbidden: "এই কাজের জন্য আপনার অনুমতি নেই।",
  "bulk-invalid": "তালিকায় সমস্যা আছে।",
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base";
const labelClass = "mb-1 block text-sm font-semibold text-slate-700";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function TreeNode({
  node,
  children,
  depth,
}: {
  node: CategoryRow;
  children: Map<string, CategoryRow[]>;
  depth: number;
}) {
  const kids = children.get(node.id) ?? [];
  return (
    <li>
      <div
        className="flex flex-wrap items-center justify-between gap-2 py-1.5"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
      >
        <span className={node.is_active ? "text-slate-900" : "text-slate-400"}>
          {node.name}
          {!node.is_active && (
            <span className="ml-2 text-xs text-rose-600">Inactive</span>
          )}
          <span className="ml-2 text-xs text-slate-400">/{node.slug}</span>
        </span>
        <Link
          href={`/admin/categories?edit=${node.id}#edit`}
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          সম্পাদনা
        </Link>
      </div>
      {kids.length > 0 && (
        <ul>
          {kids.map((kid) => (
            <TreeNode key={kid.id} node={kid} children={children} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { supabase } = await requirePermission(
    "manage_categories",
    "/admin/dashboard",
  );
  const params = await searchParams;

  const { data, error } = await supabase
    .from("categories")
    .select("id,name,name_en,slug,parent_id,category_group,sort_order,is_active")
    .order("category_group")
    .order("sort_order")
    .order("name")
    .limit(5000);
  if (error) {
    throw new Error("ক্যাটাগরি তথ্য লোড করা যায়নি।", { cause: error });
  }

  const rows = (data ?? []) as CategoryRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const children = new Map<string, CategoryRow[]>();
  for (const row of rows) {
    if (row.parent_id) {
      children.set(row.parent_id, [...(children.get(row.parent_id) ?? []), row]);
    }
  }
  const roots = rows.filter((row) => !row.parent_id);

  const status = first(params.status);
  const detail = first(params.detail);
  const added = first(params.added);
  const skipped = first(params.skipped);
  let message =
    status && Object.hasOwn(messages, status) ? messages[status] : undefined;
  if (status === "bulk-done") {
    message = `${added ?? 0}টি যোগ হয়েছে, ${skipped ?? 0}টি আগে থেকেই ছিল তাই বাদ গেছে।`;
  }
  if (status === "bulk-invalid" && detail) {
    message = `${messages["bulk-invalid"]} ${detail}`;
  }
  const isError = !!status && !["updated", "deleted", "bulk-done"].includes(status);

  const editId = first(params.edit);
  const editing = editId ? byId.get(editId) : undefined;
  let blocked = new Set<string>();
  if (editing) {
    blocked = new Set([editing.id]);
    const stack = [editing.id];
    while (stack.length > 0) {
      for (const kid of children.get(stack.pop() as string) ?? []) {
        blocked.add(kid.id);
        stack.push(kid.id);
      }
    }
  }

  const pathOf = (row: CategoryRow): string => {
    const names = [row.name];
    let cursor = row.parent_id ? byId.get(row.parent_id) : undefined;
    while (cursor) {
      names.unshift(cursor.name);
      cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
    }
    return `${groupLabels[row.category_group]} › ${names.join(" › ")}`;
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-bold text-emerald-700">CATALOG CONTROL</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-950">
          ক্যাটাগরি ব্যবস্থাপনা
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          মোট {rows.length}টি ক্যাটাগরি, {roots.length}টি মূল। নিচের "একসাথে
          যোগ করুন" অংশে তালিকা লিখে অনেকগুলো একবারে যোগ করা যায়।
        </p>
      </header>

      {message && (
        <p
          role="status"
          className={`mt-5 rounded-xl px-4 py-3 text-sm ${
            isError ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-950"
          }`}
        >
          {message}
        </p>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-bold">একসাথে যোগ করুন (Markdown তালিকা)</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          প্রতি লাইনে একটি ক্যাটাগরি। ভেতরে বসাতে লাইনের আগে ২টি স্পেস (বা Tab)
          দিন। ইংরেজি slug চাইলে নামের পরে <code>| slug</code> লিখুন; না দিলে
          ইংরেজি নাম থেকে অথবা স্বয়ংক্রিয় নম্বর দিয়ে slug তৈরি হবে। একই নামের
          ক্যাটাগরি একই জায়গায় থাকলে বাদ যায়, ডুপ্লিকেট হয় না।
        </p>
        <form action={bulkAddCategories} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bulk-group" className={labelClass}>
                গ্রুপ
              </label>
              <select id="bulk-group" name="group" className={inputClass} defaultValue="books">
                {Object.entries(groupLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bulk-parent" className={labelClass}>
                কোন ক্যাটাগরির ভেতরে বসবে (ঐচ্ছিক)
              </label>
              <select id="bulk-parent" name="parentId" className={inputClass} defaultValue="">
                <option value="">— মূল স্তরে —</option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {pathOf(row)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="bulk-markdown" className={labelClass}>
              ক্যাটাগরির তালিকা
            </label>
            <textarea
              id="bulk-markdown"
              name="markdown"
              required
              rows={10}
              placeholder={"- উপন্যাস | novels\n  - সমকালীন উপন্যাস\n  - ঐতিহাসিক উপন্যাস\n- গল্প\n  - ছোটগল্প"}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm leading-6"
            />
            <p className="mt-1 text-xs text-slate-500">একবারে সর্বোচ্চ ২০০ লাইন।</p>
          </div>
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800"
          >
            যোগ করুন
          </button>
        </form>
      </section>

      {editId && !editing && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          নির্বাচিত ক্যাটাগরি পাওয়া যায়নি।
        </p>
      )}

      {editing && (
        <section
          id="edit"
          className="mt-6 rounded-xl border border-emerald-200 bg-white p-4 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">সম্পাদনা: {editing.name}</h2>
            <Link
              href="/admin/categories"
              className="text-sm font-semibold text-slate-600 hover:underline"
            >
              বন্ধ করুন
            </Link>
          </div>
          <form action={saveCategory} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={editing.id} />
            <div>
              <label htmlFor="edit-name" className={labelClass}>নাম</label>
              <input id="edit-name" name="name" required maxLength={120} defaultValue={editing.name} className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit-name-en" className={labelClass}>English নাম (ঐচ্ছিক)</label>
              <input id="edit-name-en" name="nameEn" maxLength={120} defaultValue={editing.name_en ?? ""} className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit-slug" className={labelClass}>Slug (URL)</label>
              <input id="edit-slug" name="slug" required maxLength={160} defaultValue={editing.slug} className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit-sort" className={labelClass}>ক্রম (ছোট সংখ্যা আগে)</label>
              <input id="edit-sort" name="sortOrder" type="number" min="0" max="99999" step="1" defaultValue={editing.sort_order} className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit-parent" className={labelClass}>Parent</label>
              <select id="edit-parent" name="parentId" defaultValue={editing.parent_id ?? ""} className={inputClass}>
                <option value="">— মূল স্তর —</option>
                {rows
                  .filter(
                    (row) =>
                      row.category_group === editing.category_group &&
                      !blocked.has(row.id),
                  )
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {pathOf(row)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex min-h-11 items-center gap-2 text-base">
                <input type="checkbox" name="isActive" value="true" defaultChecked={editing.is_active} className="size-5" />
                সক্রিয় (পাবলিক সাইটে দেখাবে)
              </label>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="min-h-11 rounded-lg bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800">
                সংরক্ষণ
              </button>
            </div>
          </form>
          <form action={deleteCategory} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={editing.id} />
            <button type="submit" className="min-h-11 rounded-lg border border-rose-300 px-4 font-semibold text-rose-700 hover:bg-rose-50">
              ক্যাটাগরি মুছুন
            </button>
            <p className="mt-1 text-xs text-slate-500">
              সাবক্যাটাগরি বা সংযুক্ত পণ্য থাকলে মোছা যাবে না। এই কাজ ফেরানো যায় না।
            </p>
          </form>
        </section>
      )}

      <div className="mt-8 space-y-7">
        {(["books", "products", "electronics"] as const).map((group) => {
          const groupRoots = roots.filter((row) => row.category_group === group);
          return (
            <section key={group} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="font-bold text-slate-900">
                  {groupLabels[group]}
                  <span className="ml-2 text-xs font-medium text-slate-500">
                    {rows.filter((row) => row.category_group === group).length}টি
                  </span>
                </h2>
              </div>
              {groupRoots.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">এখনো কোনো ক্যাটাগরি নেই।</p>
              ) : (
                <ul className="divide-y divide-slate-100 px-4 py-2">
                  {groupRoots.map((root) => (
                    <TreeNode key={root.id} node={root} children={children} depth={0} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
