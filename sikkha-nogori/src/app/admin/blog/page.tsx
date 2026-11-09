import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminPostEditor, type EditablePost } from "@/components/admin-post-editor";
import { requirePermission } from "@/lib/supabase/admin";
import { archiveBlogPost } from "./actions";

export const metadata: Metadata = {
  title: "Blog Studio | Sikkha Nogori Admin",
  robots: { index: false, follow: false },
};

type Post = {
  id: string; title: string; slug: string; excerpt: string | null; content: string;
  featured_image_path: string | null; status: "draft" | "published" | "archived";
  seo_title: string | null; seo_description: string | null; category_id: string | null;
  published_at: string | null; updated_at: string;
};

const messages: Record<string, string> = {
  created: "Saved. Your article has been created.",
  updated: "Saved. Your changes are in.",
  archived: "The article has been archived.",
  invalid: "Please check the fields (the URL must use English letters, numbers and dashes) and try again.",
  "slug-exists": "That page address is already used by another article. Please choose a different one.",
  "not-found": "The selected article could not be found.",
};

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" }).format(new Date(value));
}
// Dhaka is UTC+6 with no daylight saving.
function dhakaLocal(value: string | null) {
  return value ? new Date(new Date(value).getTime() + 6 * 3600_000).toISOString().slice(0, 16) : "";
}

const statusStyle = {
  published: "bg-green-100 text-green-800",
  draft: "bg-amber-100 text-amber-800",
  archived: "bg-slate-100 text-slate-600",
};

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { supabase } = await requirePermission("manage_blog", "/admin/dashboard");
  const params = await searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const editParam = pick(params.edit);
  const statusParam = pick(params.status);
  const filter = pick(params.show) === "draft" || pick(params.show) === "published" || pick(params.show) === "archived" ? pick(params.show) : "all";

  const [{ data, error }, { data: categories, error: categoryError }, { data: general }, { data: scheduledData, error: scheduledError }] = await Promise.all([
    supabase.from("posts").select("id,title,slug,excerpt,content,featured_image_path,status,seo_title,seo_description,category_id,published_at,updated_at").order("updated_at", { ascending: false }).limit(200),
    supabase.from("categories").select("id,name").eq("is_active", true).order("name").limit(500),
    supabase.from("site_settings").select("value").eq("key", "general").maybeSingle(),
    supabase.from("posts").select("id").eq("status", "published").gt("published_at", "now"),
  ]);
  if (error) throw new Error("Unable to load blog posts.", { cause: error });
  if (categoryError) throw new Error("Unable to load blog categories.", { cause: categoryError });

  if (scheduledError) throw new Error("Unable to load scheduled blog posts.", { cause: scheduledError });

  const posts = (data ?? []) as Post[];
  const scheduledIds = new Set((scheduledData ?? []).map((post) => post.id));
  const siteName = ((general?.value ?? {}) as { site_name?: string }).site_name || "শিক্ষা নগরী";
  const row = posts.find((p) => p.id === editParam);
  const editing: EditablePost | null = row ? {
    id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt ?? "", content: row.content,
    coverUrl: row.featured_image_path ?? "", seoTitle: row.seo_title ?? "", seoDescription: row.seo_description ?? "",
    categoryId: row.category_id ?? "", status: row.status, publishAt: dhakaLocal(row.published_at),
  } : null;
  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    draft: posts.filter((p) => p.status === "draft").length,
    archived: posts.filter((p) => p.status === "archived").length,
  };
  const visible = filter === "all" ? posts : posts.filter((p) => p.status === filter);
  const notice = statusParam && messages[statusParam] ? messages[statusParam] : null;

  return (
    <main lang="en" className="mx-auto min-h-screen max-w-[1500px] bg-canvas px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Content</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Blog Studio</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-slate-600">Write articles that bring visitors from Google. Published articles appear on your blog page automatically and are added to your sitemap.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/blog" target="_blank" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">View blog ↗</Link>
          <Link href="/admin/blog#editor" className="inline-flex min-h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700">+ New article</Link>
        </div>
      </header>

      {notice && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${statusParam === "invalid" || statusParam === "slug-exists" || statusParam === "not-found" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-brand-200 bg-brand-50 text-brand-900"}`}>{notice}</p>}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
            {([["all", "All"], ["published", "Published"], ["draft", "Drafts"], ["archived", "Archived"]] as const).map(([key, name]) => (
              <Link key={key} href={key === "all" ? "/admin/blog" : `/admin/blog?show=${key}`} aria-current={filter === key ? "page" : undefined} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition ${filter === key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {name} <span className="tabular-nums opacity-80">{counts[key]}</span>
              </Link>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="font-bold">{posts.length === 0 ? "No articles yet" : "Nothing in this view"}</p>
              <p className="mt-1 text-sm text-slate-500">{posts.length === 0 ? "Write your first article using the editor. Your blog currently shows sample articles until you publish one." : "Try another filter."}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((post) => {
                const scheduled = post.status === "published" && scheduledIds.has(post.id);
                return (
                  <li key={post.id} className={`px-4 py-4 sm:px-5 ${editing?.id === post.id ? "bg-brand-50/60" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold leading-snug">{post.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">/blog/{post.slug}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${scheduled ? "bg-brand-100 text-brand-800" : statusStyle[post.status]}`}>{scheduled ? "Scheduled" : post.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-400">{post.published_at && post.status === "published" ? `${scheduled ? "Goes live" : "Published"} ${date(post.published_at)}` : `Updated ${date(post.updated_at)}`}</span>
                      <span className="flex items-center gap-4">
                        {post.status === "published" && !scheduled && <Link href={`/blog/${post.slug}`} target="_blank" className="font-bold text-slate-600 hover:text-brand-800">View ↗</Link>}
                        <Link href={`/admin/blog?edit=${post.id}#editor`} className="font-bold text-brand-700 hover:underline">Edit</Link>
                        {post.status !== "archived" && (
                          <form action={archiveBlogPost}><input type="hidden" name="id" value={post.id} /><button className="font-bold text-slate-500 hover:text-rose-700">Archive</button></form>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="editor" className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Writing desk</p>
          <h2 className="mt-1 text-xl font-bold">{editing ? "Edit article" : "New article"}</h2>
          <div className="mt-5">
            <AdminPostEditor key={editing?.id ?? "new"} post={editing} categories={categories ?? []} siteName={siteName} />
          </div>
        </section>
      </div>
    </main>
  );
}
