import type { Metadata } from "next";
import Link from "next/link";
import { blogArticles } from "@/lib/blog";

export const metadata: Metadata = {
  title: "শিক্ষা নগরী ব্লগ",
  description: "বই পড়া, ভাষা শিক্ষা ও অনলাইন কোর্স নিয়ে ব্যবহারিক লেখা।",
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="font-semibold text-emerald-700">
          ← শিক্ষা নগরী
        </Link>

        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">পড়ুন ও শিখুন</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            শিক্ষা নগরী ব্লগ
          </h1>
          <p className="mt-3 text-slate-600">
            বই, ভাষা শিক্ষা ও দক্ষতা উন্নয়ন নিয়ে ব্যবহারিক লেখা।
          </p>
        </header>

        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {blogArticles.map((article) => (
            <li key={article.slug}>
              <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-emerald-700">
                  {article.category}
                </p>
                <h2 className="mt-3 text-xl font-bold">{article.title}</h2>
                <p className="mt-3 flex-1 leading-7 text-slate-600">
                  {article.description}
                </p>
                <Link
                  href={`/blog/${article.slug}`}
                  className="mt-5 inline-flex min-h-11 w-fit items-center rounded-lg border border-emerald-700 px-4 py-2 font-bold text-emerald-800 transition hover:bg-emerald-50"
                >
                  লেখাটি পড়ুন →
                </Link>
              </article>
            </li>
          ))}
        </ul>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-600">
          <Link href="/books" className="font-semibold text-emerald-800 hover:underline">
            বইয়ের সংগ্রহ
          </Link>
          <span className="px-3" aria-hidden="true">
            ·
          </span>
          <Link href="/courses" className="font-semibold text-emerald-800 hover:underline">
            অনলাইন কোর্স
          </Link>
          <span className="px-3" aria-hidden="true">
            ·
          </span>
          <Link href="/contact" className="font-semibold text-emerald-800 hover:underline">
            যোগাযোগ
          </Link>
        </footer>
      </div>
    </main>
  );
}
