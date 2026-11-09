import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatPostDate, getPublishedPosts, type PublicPost } from "@/lib/blog-posts";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSiteSettings();
  const title = `ব্লগ | ${general.siteName}`;
  const description = "বই পড়া, ভাষা শিক্ষা ও অনলাইন কোর্স নিয়ে ব্যবহারিক লেখা।";
  return {
    title,
    description,
    alternates: { canonical: "/blog" },
    openGraph: { title, description, type: "website", url: "/blog" },
  };
}

function Cover({ post, className }: { post: PublicPost; className: string }) {
  return post.coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={post.coverUrl} alt="" loading="lazy" className={`${className} object-cover`} />
  ) : (
    <div aria-hidden="true" className={`${className} flex items-center justify-center bg-gradient-to-br from-emerald-700 to-emerald-900 text-5xl font-black text-white/25`}>
      {post.title.slice(0, 1)}
    </div>
  );
}

function Meta({ post }: { post: PublicPost }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-slate-500">
      {post.category && <span className="font-bold text-emerald-700">{post.category}</span>}
      {post.category && <span aria-hidden="true">·</span>}
      {post.publishedAt && <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>}
      {post.publishedAt && <span aria-hidden="true">·</span>}
      <span>{post.minutes} মিনিটের পাঠ</span>
    </p>
  );
}

async function BlogList({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  await connection();
  const params = await searchParams;
  const selected = Array.isArray(params.category) ? params.category[0] : params.category;
  const all = await getPublishedPosts();
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean))];
  const posts = selected ? all.filter((p) => p.category === selected) : all;
  const [featured, ...rest] = posts;

  return (
    <>
      {categories.length > 1 && (
        <nav aria-label="বিভাগ" className="mt-7 flex flex-wrap gap-2">
          {[{ label: "সব লেখা", value: "" }, ...categories.map((c) => ({ label: c, value: c }))].map((chip) => {
            const active = (selected ?? "") === chip.value;
            return (
              <Link
                key={chip.label}
                href={chip.value ? `/blog?category=${encodeURIComponent(chip.value)}` : "/blog"}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${active ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800"}`}
              >
                {chip.label}
              </Link>
            );
          })}
        </nav>
      )}

      {!featured ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-600">এই বিভাগে এখনো কোনো লেখা নেই।</p>
      ) : (
        <>
          <Link href={`/blog/${featured.slug}`} className="group mt-8 grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg md:grid-cols-2">
            <Cover post={featured} className="aspect-[16/10] w-full md:h-full" />
            <div className="flex flex-col justify-center p-6 sm:p-9">
              <Meta post={featured} />
              <h2 className="mt-3 text-2xl font-extrabold leading-snug text-slate-900 group-hover:text-emerald-800 sm:text-3xl">{featured.title}</h2>
              <p className="mt-3 line-clamp-3 leading-7 text-slate-600">{featured.excerpt}</p>
              <span className="mt-5 inline-flex items-center font-bold text-emerald-700">লেখাটি পড়ুন →</span>
            </div>
          </Link>

          {rest.length > 0 && (
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <Cover post={post} className="aspect-[16/10] w-full" />
                    <div className="flex flex-1 flex-col p-5">
                      <Meta post={post} />
                      <h3 className="mt-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-emerald-800">{post.title}</h3>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                      <span className="mt-4 text-sm font-bold text-emerald-700">পড়ুন →</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

export default function BlogPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">হোম</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span>ব্লগ</span>
        </nav>
        <header className="mt-6">
          <p className="text-sm font-bold text-emerald-700">পড়ুন ও শিখুন</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">ব্লগ</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">বই, ভাষা শিক্ষা ও দক্ষতা উন্নয়ন নিয়ে ব্যবহারিক লেখা।</p>
        </header>
        <Suspense fallback={<div className="mt-8 h-72 animate-pulse rounded-3xl bg-white" />}>
          <BlogList searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
