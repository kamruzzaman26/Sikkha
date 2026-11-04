import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { archiveBlogPost, saveBlogPost } from "./actions";

export const metadata: Metadata = {
  title: "Blog Studio | Sikkha Nogori Admin",
  robots: { index: false, follow: false },
};

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: "draft" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
  category_id: string | null;
  published_at: string | null;
  updated_at: string;
};

const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600";

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { supabase } = await requirePermission("manage_blog", "/admin/dashboard");
  const params = await searchParams;
  const editParam = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;

  const [{ data, error }, { data: categories, error: categoryError }] = await Promise.all([
    supabase.from("posts").select("id,title,slug,excerpt,content,status,seo_title,seo_description,category_id,published_at,updated_at").order("updated_at", { ascending: false }).limit(200),
    supabase.from("categories").select("id,name").eq("is_active", true).order("name").limit(500),
  ]);
  if (error) throw new Error("Unable to load blog posts.", { cause: error });
  if (categoryError) throw new Error("Unable to load blog categories.", { cause: categoryError });

  const posts = (data ?? []) as Post[];
  const editing = posts.find((post) => post.id === editParam);
  const counts = {
    all: posts.length,
    published: posts.filter((post) => post.status === "published").length,
    drafts: posts.filter((post) => post.status === "draft").length,
  };
  const messages: Record<string, string> = {
    created: "Your post has been created.",
    updated: "Your changes have been saved.",
    archived: "The post has been archived.",
    invalid: "Please check the fields and try again.",
    "slug-exists": "That URL slug is already in use.",
    "not-found": "The selected post could not be found.",
  };
  const notice = statusParam && messages[statusParam] ? messages[statusParam] : null;

  return (
    <main lang="en" className="min-h-screen bg-[#f3f7f5] px-4 py-6 text-slate-900 sm:px-7 sm:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[28px] bg-[#082f29] px-6 py-7 text-white shadow-[0_22px_60px_-35px_rgba(8,47,41,.65)] sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[36px] border-white/[0.04]" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.24em] text-emerald-200">Content workspace</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Blog Studio</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">Create, edit and publish helpful articles for the Sikkha Nogori community.</p>
            </div>
            <Link href="/admin/blog#editor" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-300 px-5 text-sm font-extrabold text-[#073c32] shadow-lg transition hover:bg-emerald-200">+ New article</Link>
          </div>
          <div className="relative mt-8 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
            {[
              ["Total articles", counts.all],
              ["Published", counts.published],
              ["Drafts", counts.drafts],
            ].map(([name, count]) => (
              <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100/65">{name}</p>
                <p className="mt-1 text-2xl font-black tabular-nums">{count}</p>
              </div>
            ))}
          </div>
        </header>

        {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{notice}</p>}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_-28px_rgba(15,55,42,.35)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-700">Content library</p>
                <h2 className="mt-1 text-xl font-extrabold">Articles</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{posts.length} records</span>
            </div>
            {posts.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-800">✎</div>
                <h3 className="mt-3 font-bold">Your content library is empty</h3>
                <p className="mt-1 text-sm text-slate-500">Create your first article using the editor.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {posts.map((post) => (
                  <article key={post.id} className={`rounded-2xl border p-4 transition hover:border-emerald-200 ${editing?.id === post.id ? "border-emerald-300 bg-emerald-50/40" : "border-slate-100 bg-white"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold leading-5">{post.title}</h3>
                        <p className="mt-1 truncate text-xs text-slate-500">/blog/{post.slug}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{post.excerpt || post.content.slice(0, 160) || "No summary added yet."}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${post.status === "published" ? "bg-emerald-100 text-emerald-800" : post.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{post.status}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <span className="text-[11px] text-slate-400">Updated {date(post.updated_at)}</span>
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/blog?edit=${post.id}#editor`} className="text-xs font-extrabold text-emerald-800 hover:underline">Edit article</Link>
                        {post.status !== "archived" && (
                          <form action={archiveBlogPost}>
                            <input type="hidden" name="id" value={post.id} />
                            <button className="text-xs font-bold text-slate-500 hover:text-rose-700">Archive</button>
                          </form>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="editor" className="scroll-mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_-28px_rgba(15,55,42,.35)] sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-700">Writing desk</p>
            <h2 className="mt-1 text-xl font-extrabold">{editing ? "Edit article" : "Create article"}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">Add clear, useful content. Save as draft or publish when ready.</p>
            <form action={saveBlogPost} className="mt-5 space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div>
                <label className={label} htmlFor="post-title">Article title</label>
                <input id="post-title" name="title" required minLength={3} maxLength={180} defaultValue={editing?.title ?? ""} placeholder="Write a clear article title" className={input} />
              </div>
              <div>
                <label className={label} htmlFor="post-slug">URL slug</label>
                <input id="post-slug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={180} defaultValue={editing?.slug ?? ""} placeholder="example-article-title" className={input} />
              </div>
              <div>
                <label className={label} htmlFor="post-category">Category</label>
                <select id="post-category" name="categoryId" defaultValue={editing?.category_id ?? ""} className={input}>
                  <option value="">Uncategorized</option>
                  {(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="post-excerpt">Short summary</label>
                <textarea id="post-excerpt" name="excerpt" rows={2} maxLength={500} defaultValue={editing?.excerpt ?? ""} placeholder="A short introduction shown in article previews" className={input} />
              </div>
              <div>
                <label className={label} htmlFor="post-content">Article content</label>
                <textarea id="post-content" name="content" required rows={10} maxLength={50000} defaultValue={editing?.content ?? ""} placeholder="Write your article content here..." className={`${input} min-h-64 resize-y leading-6`} />
                <p className="mt-1 text-[11px] text-slate-400">Up to 50,000 characters. Plain text for now.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Search appearance</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className={label} htmlFor="seo-title">SEO title</label>
                    <input id="seo-title" name="seoTitle" maxLength={200} defaultValue={editing?.seo_title ?? ""} placeholder="Search result title" className={input} />
                  </div>
                  <div>
                    <label className={label} htmlFor="seo-description">Meta description</label>
                    <textarea id="seo-description" name="seoDescription" rows={2} maxLength={320} defaultValue={editing?.seo_description ?? ""} placeholder="Short description for search engines" className={input} />
                  </div>
                </div>
              </div>
              <div>
                <label className={label} htmlFor="post-status">Publishing status</label>
                <select id="post-status" name="status" defaultValue={editing?.status ?? "draft"} className={input}>
                  <option value="draft">Save as draft</option>
                  <option value="published">Publish now</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" className="min-h-11 flex-1 rounded-xl bg-[#0a5748] px-5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#073c32]">{editing ? "Save changes" : "Create article"}</button>
                {editing && <Link href="/admin/blog#editor" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</Link>}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
