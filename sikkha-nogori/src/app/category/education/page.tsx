import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "পড়াশোনা ও দক্ষতা | শিক্ষা নগরী",
  description: "পড়াশোনা ও দক্ষতা উন্নয়নের প্রকাশিত অনলাইন কোর্স দেখুন।",
};

export default function EducationPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-semibold text-emerald-700">
          ← শিক্ষা নগরী
        </Link>
        <p className="mt-8 text-sm font-bold text-emerald-700">
          কোর্স ও শেখার উপকরণ
        </p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
          পড়াশোনা ও দক্ষতা
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          অনলাইন কোর্স, শেখার টিপস ও নতুন দক্ষতা অর্জনের জন্য উপযুক্ত সম্পদ।
        </p>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold">কোর্স খুঁজুন</h2>
          <p className="mt-3 leading-7 text-slate-600">
            যাচাইকৃত কোর্সের বিষয়, বিবরণ ও পার্টনার লিংক ক্যাটালগে প্রকাশিত
            হলে এখানে দেখা যাবে।
          </p>
          <Link
            href="/courses"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
          >
            কোর্স ক্যাটালগ দেখুন
          </Link>
        </section>
      </div>
    </main>
  );
}
