import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getActiveAffiliateLinks } from "@/lib/supabase/affiliate-links";
import { getPublishedCourseBySlug } from "@/lib/catalog";
import { formatPrice } from "@/lib/books";
import { WishlistButton } from "@/components/wishlist-button";

export const metadata: Metadata = {
  title: "কোর্সের বিস্তারিত | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

async function CourseDetails({
  params,
}: Pick<PageProps<"/courses/[slug]">, "params">) {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);

  if (course === null) {
    return (
      <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 leading-7 text-amber-950">
        কোর্স ক্যাটালগ এখনো ডেটাবেসে চালু হয়নি।
      </p>
    );
  }

  if (!course) {
    notFound();
  }

  const affiliateLinks =
    course.commerce_mode === "affiliate"
      ? await getActiveAffiliateLinks(course.slug)
      : [];

  return (
    <article className="mt-7 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-10">
      {course.category && (
        <p className="text-sm font-bold text-emerald-700">{course.category}</p>
      )}
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{course.title}</h1>
      <p className="mt-5 max-w-3xl leading-8 text-slate-600">
        {course.description}
      </p>
      {course.commerce_mode === "direct" ? (
        course.price === null ? (
          <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            এই নিজস্ব বিক্রির কোর্সের মূল্য এখনো নির্ধারণ করা হয়নি।
          </p>
        ) : (
          <section className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-2xl font-extrabold text-emerald-800">
              {formatPrice(course.price)}
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              এই পণ্যটি শিক্ষা নগরীর নিজস্ব বিক্রির জন্য তালিকাভুক্ত।
            </p>
            <Link
              href={`/checkout?product=${encodeURIComponent(course.id)}`}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800"
            >
              অর্ডারের জন্য এগিয়ে যান
            </Link>
          </section>
        )
      ) : affiliateLinks === null ? (
        <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          পার্টনার লিংক ডেটাবেসে এখনো চালু হয়নি।
        </p>
      ) : affiliateLinks.length > 0 ? (
        <section
          aria-labelledby="course-partners"
          className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-5"
        >
          <h2 id="course-partners" className="font-bold text-emerald-950">
            পার্টনারের কাছে কোর্সটি দেখুন
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900">
            এই affiliate link থেকে শিক্ষা নগরী কমিশন পেতে পারে; তবে অনুমোদিত
            link হলেও চূড়ান্ত গন্তব্য বা commission tracking নিশ্চিত নয়।
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {affiliateLinks.map((link) => {
              const partnerName =
                link.partner === "rokomari"
                  ? "Rokomari"
                  : link.partner === "10_minute_school"
                    ? "10 Minute School"
                    : "পার্টনার";

              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  {partnerName}-এ দেখুন
                </a>
              );
            })}
          </div>
        </section>
      ) : (
        <p className="mt-7 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          এই কোর্সের জন্য কোনো সক্রিয় পার্টনার লিংক এখনো প্রকাশ করা হয়নি।
        </p>
      )}

      <div className="mt-5 max-w-xs">
        <WishlistButton slug={course.slug} />
      </div>
      <Link
        href="/courses"
        className="mt-7 inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-50"
      >
        ← কোর্স তালিকায় ফিরুন
      </Link>
    </article>
  );
}

export default function CourseDetailsPage({
  params,
}: PageProps<"/courses/[slug]">) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <Link
            href="/courses"
            className="font-semibold text-emerald-800 hover:underline"
          >
            কোর্স
          </Link>
        </nav>
        <Suspense
          fallback={
            <div className="mt-7 h-72 animate-pulse rounded-3xl bg-white" />
          }
        >
          <CourseDetails params={params} />
        </Suspense>
      </div>
    </main>
  );
}
