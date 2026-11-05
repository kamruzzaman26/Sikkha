import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getPublishedCourses } from "@/lib/catalog";
import { formatPrice } from "@/lib/books";
import { WishlistButton } from "@/components/wishlist-button";

export const metadata: Metadata = {
  title: "অনলাইন কোর্স | শিক্ষা নগরী",
  description: "শিক্ষা নগরীর যাচাইকৃত অনলাইন কোর্সের তালিকা দেখুন।",
};

async function CourseCatalog() {
  const courses = await getPublishedCourses();

  if (!courses) {
    return (
      <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 leading-7 text-amber-950">
        কোর্স ক্যাটালগ এখনো ডেটাবেসে চালু হয়নি। সাইট পরিচালকের ডেটাবেস সেটআপ
        সম্পন্ন হলে কোর্স এখানে দেখা যাবে।
      </p>
    );
  }

  return courses.length === 0 ? (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
      <h2 className="text-xl font-bold">কোর্স ক্যাটালগ প্রস্তুত হচ্ছে</h2>
      <p className="mx-auto mt-2 max-w-xl leading-7 text-slate-600">
        যাচাইকৃত কোর্স এখনো প্রকাশ করা হয়নি। নতুন কোর্স যোগ হলে এখানে তার
        বিবরণ ও সংশ্লিষ্ট সক্রিয় পার্টনার লিংক দেখা যাবে।
      </p>
      <Link
        href="/contact"
        className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
      >
        যোগাযোগ
      </Link>
    </div>
  ) : (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <li key={course.id}>
          <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-md">
            <Link
              href={`/courses/${course.slug}`}
              className="flex flex-1 flex-col"
            >
              {course.category && (
                <span className="text-sm font-semibold text-emerald-700">
                  {course.category}
                </span>
              )}
              <h2 className="mt-2 text-xl font-bold">{course.title}</h2>
              <p className="mt-3 flex-1 leading-7 text-slate-600">
                {course.description}
              </p>
              {course.commerce_mode === "direct" &&
                course.price !== null && (
                  <span className="mt-5 font-extrabold text-emerald-800">
                    {formatPrice(course.price)}
                  </span>
                )}
              {course.commerce_mode === "affiliate" && (
                <span className="mt-5 text-sm font-semibold text-slate-600">
                  বাইরের বিক্রেতার কাছে উপলভ্য
                </span>
              )}
              <span className="mt-4 text-sm font-bold text-emerald-800">
                কোর্সের বিস্তারিত দেখুন →
              </span>
            </Link>
            <div className="mt-3">
              <WishlistButton slug={course.slug} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

export default function CoursesPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <span>কোর্স</span>
        </nav>

        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">শিক্ষা নগরী</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            অনলাইন কোর্স
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            শেখার লক্ষ্য অনুযায়ী কোর্সের বিবরণ দেখুন। পার্টনারের মাধ্যমে কোর্স
            কিনলে শিক্ষা নগরী কমিশন পেতে পারে।
          </p>
        </header>

        <Suspense
          fallback={
            <div
              aria-label="কোর্স লোড হচ্ছে"
              className="mt-8 h-64 animate-pulse rounded-2xl bg-white"
            />
          }
        >
          <CourseCatalog />
        </Suspense>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-600">
          <Link href="/books" className="font-semibold text-emerald-800 hover:underline">
            বইয়ের সংগ্রহ
          </Link>
          <span className="px-3" aria-hidden="true">
            ·
          </span>
          <Link href="/blog" className="font-semibold text-emerald-800 hover:underline">
            শিক্ষামূলক লেখা
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
