import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getBlogArticle } from "@/lib/blog";

export const metadata: Metadata = {
  title: "শিক্ষামূলক লেখা | শিক্ষা নগরী",
};

async function BlogArticleContent({
  params,
}: Pick<PageProps<"/blog/[slug]">, "params">) {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <article className="mx-auto max-w-3xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <Link href="/blog" className="font-semibold text-emerald-800 hover:underline">
            ব্লগ
          </Link>
        </nav>

        <header className="mt-8 rounded-3xl bg-[#006b4f] p-6 text-white sm:p-9">
          <p className="text-sm font-bold text-emerald-100">{article.category}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-4 leading-7 text-emerald-50">
            {article.description}
          </p>
        </header>

        <div className="mt-7 space-y-7 rounded-3xl border border-slate-200 bg-white p-6 sm:p-9">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-bold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-8 text-slate-700">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            ← সব লেখা
          </Link>
          <Link
            href="/courses"
            className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
          >
            কোর্স দেখুন
          </Link>
        </div>
      </article>
    </main>
  );
}

export default function BlogArticlePage({
  params,
}: PageProps<"/blog/[slug]">) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
          <article className="mx-auto max-w-3xl animate-pulse rounded-3xl bg-white p-8">
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="mt-6 h-44 rounded-2xl bg-slate-100" />
          </article>
        </main>
      }
    >
      <BlogArticleContent params={params} />
    </Suspense>
  );
}
