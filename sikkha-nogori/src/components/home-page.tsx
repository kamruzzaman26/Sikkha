import Link from "next/link";
import BookCard from "@/components/book-card";
import {
  bookCategories,
  getBooksInCategory,
  getBooksInCollection,
  type Book,
} from "@/lib/books";

type CategoryIconName =
  | "islamic"
  | "arabic"
  | "academic"
  | "admission"
  | "language"
  | "other";

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function CategoryIcon({ name }: { name: CategoryIconName }) {
  const shared = {
    "aria-hidden": true as const,
    className: "size-6",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "islamic":
      return (
        <svg {...shared}>
          <path d="M12 3.5 14 8l4.5 2-4.5 2-2 4.5L10 12l-4.5-2L10 8l2-4.5Z" />
          <path d="M18.5 15.5 19.5 18l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
        </svg>
      );
    case "arabic":
      return (
        <svg {...shared}>
          <path d="M4 6.5c2.7-1.2 5.3-1.2 8 0v12c-2.7-1.2-5.3-1.2-8 0v-12Z" />
          <path d="M20 6.5c-2.7-1.2-5.3-1.2-8 0v12c2.7-1.2 5.3-1.2 8 0v-12Z" />
          <path d="M7 10h2M7 13h2m6-3h2m-2 3h2" />
        </svg>
      );
    case "academic":
      return (
        <svg {...shared}>
          <path d="m3 9 9-5 9 5-9 5-9-5Z" />
          <path d="M7 11.2v5.3c2.9 2.3 7.1 2.3 10 0v-5.3M21 9v6" />
        </svg>
      );
    case "admission":
      return (
        <svg {...shared}>
          <path d="M5 3.5h10l4 4v13H5v-17Z" />
          <path d="M14.5 3.5v4h4M8 12h8m-8 4h6" />
          <path d="m8.5 8.5 1 1 2-2" />
        </svg>
      );
    case "language":
      return (
        <svg {...shared}>
          <path d="M4 5h11M9.5 3v2m4 0c-.5 4-3.1 7-7 9m1-6c1 2.5 3.2 4.5 6 5.5M13 20l4-10 4 10m-6.5-3h5" />
        </svg>
      );
    case "other":
      return (
        <svg {...shared}>
          <path d="M5 4.5h14v15H5zM8 8h8m-8 3.5h8m-8 3.5h5" />
        </svg>
      );
  }
}

function BookSection({
  title,
  description,
  books,
  href,
  id,
}: {
  title: string;
  description: string;
  books: Book[];
  href: string;
  id?: string;
}) {
  if (books.length === 0) {
    return null;
  }

  return (
    <section id={id} className="scroll-mt-6 py-8 sm:py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Books</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          View All <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:thin] sm:gap-4">
        {books.map((book) => (
          <div key={book.slug} className="w-[44%] min-w-[9.5rem] max-w-[13rem] shrink-0 snap-start sm:w-[30%] lg:w-[22%]">
            <BookCard book={book} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const academicAndAdmissionBooks = [
    ...getBooksInCategory("academic"),
    ...getBooksInCategory("admission-prep"),
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faf8] text-slate-900">
      <div className="bg-[#005640] px-4 py-2 text-center text-xs font-semibold leading-5 text-white sm:text-sm">
        হোমপেজের বই ও মূল্য নমুনা · অর্ডার করুন শুধু checkout-এ থাকা প্রকাশিত পণ্য
      </div>

      <header className="hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 px-4 py-3 sm:px-6 sm:py-4 lg:grid-cols-[auto_minmax(18rem,1fr)_auto] lg:gap-8 lg:px-8">
          <Link
            href="/"
            aria-label="শিক্ষা নগরী — হোম"
            className="flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#006b4f] text-lg font-extrabold text-white shadow-sm"
            >
              শি
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-extrabold leading-tight text-[#064b3b] sm:text-xl">
                শিক্ষা নগরী
              </span>
              <span className="mt-0.5 hidden text-xs font-medium text-slate-500 min-[390px]:block">
                জ্ঞানের আপন ঠিকানা
              </span>
            </span>
          </Link>

          <form
            action="/books"
            method="get"
            role="search"
            className="order-3 col-span-2 min-w-0 lg:order-none lg:col-span-1"
          >
            <div className="flex min-h-12 rounded-xl border border-slate-200 bg-[#f8faf9] p-1 transition focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
              <label className="sr-only" htmlFor="book-search">
                বইয়ের নাম বা লেখক দিয়ে খুঁজুন
              </label>
              <span className="flex items-center pl-3 text-slate-400">
                <SearchIcon />
              </span>
              <input
                id="book-search"
                name="q"
                type="search"
                placeholder="বইয়ের নাম বা লেখক দিয়ে খুঁজুন"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="min-h-10 rounded-lg bg-[#006b4f] px-4 text-sm font-bold text-white transition hover:bg-[#005640] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                খুঁজুন
              </button>
            </div>
          </form>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <Link
              href="/login"
              className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:px-3"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.7-3.5 3.1-5.3 7-5.3s6.3 1.8 7 5.3" />
              </svg>
              <span className="hidden sm:inline">লগইন</span>
            </Link>
            <Link
              href="/checkout"
              aria-label="Checkout-এ অর্ডার করুন"
              title="প্রকাশিত পণ্য অর্ডার করুন"
              className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-50 sm:px-3"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              >
                <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 8H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              <span className="hidden sm:inline">অর্ডার</span>
            </Link>
          </div>
        </div>

        <nav
          aria-label="প্রধান নেভিগেশন"
          className="hidden border-t border-slate-100 lg:block"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-8 py-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
            >
              হোম
            </Link>
            {bookCategories.map((category) => (
              <Link
                key={category.slug}
                href={category.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
              >
                {category.title}
              </Link>
            ))}
            <Link
              href="/books"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
            >
              সকল বই
            </Link>
            <Link
              href="/courses"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
            >
              কোর্স
            </Link>
            <Link
              href="/blog"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
            >
              ব্লগ
            </Link>
            <Link
              href="/contact"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
            >
              যোগাযোগ
            </Link>
          </div>
        </nav>

        <details className="border-t border-slate-100 lg:hidden">
          <summary className="mx-auto flex min-h-12 max-w-7xl cursor-pointer list-none items-center gap-2 px-4 text-sm font-bold text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700 sm:px-6 [&::-webkit-details-marker]:hidden">
            <svg
              aria-hidden="true"
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Categories
          </summary>
          <nav
            aria-label="বইয়ের বিভাগ"
            className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-[#f8faf9] px-4 py-3 sm:grid-cols-3 sm:px-6"
          >
            <Link
              href="/"
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-white"
            >
              হোম
            </Link>
            {bookCategories.map((category) => (
              <Link
                key={category.slug}
                href={category.href}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                {category.title}
              </Link>
            ))}
            <Link
              href="/books"
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              সকল বই
            </Link>
            <Link
              href="/courses"
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              অনলাইন কোর্স
            </Link>
            <Link
              href="/blog"
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              শিক্ষামূলক লেখা
            </Link>
            <Link
              href="/contact"
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              যোগাযোগ
            </Link>
          </nav>
        </details>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#006b4f] px-5 py-9 text-white shadow-sm sm:px-10 sm:py-12 lg:px-14 lg:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full border-[2.5rem] border-white/[0.07] sm:right-8 sm:top-[-11rem] sm:size-[28rem]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 right-[22%] size-72 rounded-full border border-white/10"
          />
          <div className="relative z-10 max-w-2xl lg:max-w-[58%]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-emerald-50">
              <span aria-hidden="true" className="size-2 rounded-full bg-emerald-200" />
              পড়ার আনন্দ, শেখার শক্তি
            </span>
            <h1 className="mt-5 max-w-[17ch] text-3xl font-extrabold leading-[1.35] tracking-tight sm:text-4xl sm:leading-[1.4] lg:text-5xl">
              আপনার পছন্দের বইটি খুঁজে নিন এখানেই
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-emerald-50 sm:text-lg sm:leading-8">
              ইসলামিক জ্ঞান, আরবি শিক্ষা ও একাডেমিক প্রস্তুতি—সব ধরনের বইয়ের
              নির্ভরযোগ্য সংগ্রহ।
            </p>
            <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
              <Link
                href="/books"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#064b3b] shadow-sm transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-base"
              >
                Browse Books <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="#new-books"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-base"
              >
                Explore New Arrivals
              </Link>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-10 hidden h-64 w-64 items-center justify-center rounded-full border border-white/10 lg:flex lg:right-20 lg:h-80 lg:w-80"
          >
            <div className="absolute inset-5 rotate-45 rounded-[2rem] border border-white/10" />
            <svg
              className="relative size-40 text-emerald-100/90 lg:size-48"
              viewBox="0 0 160 160"
              fill="none"
            >
              <path
                d="M24 43c19-8 38-5 56 6v67c-18-11-37-14-56-6V43Z"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                d="M136 43c-19-8-38-5-56 6v67c18-11 37-14 56-6V43Z"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path d="M39 61c10-2 19 0 28 5m-28 9c10-2 19 0 28 5m26-14c9-5 18-7 28-5m-28 19c9-5 18-7 28-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="m80 27 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="currentColor" />
            </svg>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="categories-title"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
      >
        <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
          <div>
            <p className="text-sm font-bold text-emerald-700">বিষয় বেছে নিন</p>
            <h2
              id="categories-title"
              className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
            >
              Shop By Category
            </h2>
          </div>
          <Link
            href="/books"
            className="min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
          >
            View All <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible lg:grid-cols-6">
          {bookCategories.map((category) => (
            <Link
              key={category.slug}
              href={category.href}
              className="group flex min-h-28 w-44 shrink-0 snap-start items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-[0_2px_12px_rgba(15,55,40,0.03)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:min-h-32 sm:w-auto sm:flex-col sm:items-start sm:justify-between sm:p-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition group-hover:bg-emerald-100 sm:size-12">
                <CategoryIcon name={category.icon} />
              </span>
              <span className="text-sm font-bold leading-5 text-slate-800 sm:text-base">
                {category.title}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <BookSection
          title="Trending Books"
          description="উদাহরণ হিসেবে দেখানো বইয়ের তথ্য; বাস্তব মূল্য বা বিক্রয়-র‌্যাঙ্কিং নয়"
          books={getBooksInCollection("popular")}
          href="/books"
        />
        <BookSection
          id="new-books"
          title="New Arrivals"
          description="ক্যাটালগের আরও উদাহরণ; প্রকাশের তারিখ যাচাইকৃত নয়"
          books={getBooksInCollection("new")}
          href="/books"
        />
        <BookSection
          title="ইসলামি বই"
          description="ইসলামিক জ্ঞান ও পাঠের নমুনা বই"
          books={getBooksInCategory("islamic-books")}
          href="/books?category=islamic-books"
        />
        <BookSection
          title="আরবি শিক্ষা"
          description="আরবি শেখার প্রাথমিক পাঠ ও অনুশীলনের নমুনা"
          books={getBooksInCategory("arabic-learning")}
          href="/books?category=arabic-learning"
        />
        <BookSection
          title="একাডেমিক ও ভর্তি প্রস্তুতি"
          description="পড়াশোনা ও পরীক্ষার প্রস্তুতির নমুনা বই"
          books={academicAndAdmissionBooks}
          href="/books?category=academic"
        />
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white px-5 py-7 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full border-[1.5rem] border-emerald-50"
          />
          <div className="relative">
            <p className="text-sm font-bold text-emerald-700">শেখার সঙ্গী</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
              জ্ঞানের পথে আপনার পরের বইটি খুঁজে নিন
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              বিভাগ বেছে দেখুন, অথবা বইয়ের নাম ও লেখক দিয়ে খুঁজুন।
            </p>
          </div>
          <Link
            href="/books"
            className="relative mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#006b4f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#005640] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:mt-0"
          >
            সকল বই দেখুন <span aria-hidden="true">←</span>
          </Link>
        </div>
      </section>

      <footer className="hidden">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:grid-cols-2 sm:px-6 sm:py-11 lg:grid-cols-[1.4fr_0.8fr_1fr] lg:px-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-lg text-xl font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-base">
                শি
              </span>
              শিক্ষা নগরী
            </Link>
            <p className="mt-3 max-w-md text-sm leading-7 text-emerald-100/80">
              ইসলামিক জ্ঞান, আরবি শিক্ষা ও একাডেমিক প্রস্তুতির বই এক জায়গায়
              খুঁজে দেখুন।
            </p>
          </div>
          <div>
            <h2 className="font-bold text-white">দ্রুত লিংক</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-emerald-100/80">
              <li>
                <Link className="hover:text-white" href="/about">
                  আমাদের সম্পর্কে
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="/">
                  হোম
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="/books">
                  সকল বই
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="/blog">
                  শিক্ষামূলক লেখা
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="/courses">
                  অনলাইন কোর্স
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
                >
                  অর্ডার
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="/contact">
                  যোগাযোগ
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="/login">
                  লগইন
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-bold text-white">বইয়ের বিভাগ</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-emerald-100/80">
              {bookCategories.map((category) => (
                <li key={category.slug}>
                  <Link className="hover:text-white" href={category.href}>
                    {category.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs leading-5 text-emerald-100/70">
          © শিক্ষা নগরী · প্রদর্শিত বই ও মূল্য নমুনা; বাস্তব বিক্রয় বা অর্ডার
          চালু নয়
        </div>
      </footer>
    </main>
  );
}
