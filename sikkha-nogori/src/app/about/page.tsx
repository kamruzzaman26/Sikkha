import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "আমাদের সম্পর্কে — শিক্ষা নগরী",
  description:
    "শিক্ষা নগরীর উদ্দেশ্য, কাজ এবং শিক্ষার্থীদের শেখার পথে আমাদের লক্ষ্য।",
};

const focusAreas = [
  "শিক্ষামূলক বই ও পড়াশোনার উপকরণ",
  "অনলাইন কোর্সের তথ্য",
  "শিক্ষামূলক কনটেন্ট ও রিসোর্স",
  "জ্ঞান ও ব্যবহারিক দক্ষতা উন্নয়ন",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="font-semibold text-emerald-700">
          ← শিক্ষা নগরী
        </Link>

        <header className="mt-8 rounded-3xl bg-[#006b4f] p-6 text-white sm:p-10">
          <p className="text-sm font-semibold text-emerald-100">শিক্ষা নগরী</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            আমাদের সম্পর্কে — শিক্ষা নগরী
          </h1>
          <p className="mt-5 text-base leading-8 text-emerald-50 sm:text-lg">
            শিক্ষা নগরী একটি শিক্ষামূলক প্ল্যাটফর্ম। আমাদের লক্ষ্য হলো
            শিক্ষার্থীদের জন্য উপকারী বই, অনলাইন কোর্স এবং শিক্ষাসংশ্লিষ্ট তথ্য
            সহজে খুঁজে পাওয়ার সুযোগ তৈরি করা।
          </p>
        </header>

        <div className="mt-6 grid gap-5">
          <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-emerald-950">আমাদের উদ্দেশ্য</h2>
            <p className="mt-3 leading-8 text-slate-600">
              শিক্ষার্থীদের শেখার আগ্রহ বাড়ানো এবং তাদের প্রয়োজন অনুযায়ী বই,
              কোর্স ও শিক্ষামূলক রিসোর্স খুঁজে পেতে সহায়তা করা।
            </p>
          </section>

          <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-emerald-950">
              আমরা যা নিয়ে কাজ করি
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {focusAreas.map((area) => (
                <li
                  key={area}
                  className="rounded-xl bg-emerald-50 px-4 py-3 leading-7 text-emerald-950"
                >
                  {area}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-emerald-950">আমাদের লক্ষ্য</h2>
            <p className="mt-3 leading-8 text-slate-600">
              শিক্ষার্থীদের জন্য একটি সহজ, ব্যবহারবান্ধব ও তথ্যবহুল শিক্ষামূলক
              প্ল্যাটফর্ম গড়ে তোলা।
            </p>
          </section>

          <p className="rounded-2xl bg-emerald-900 px-6 py-7 text-center text-xl font-bold leading-8 text-white sm:text-2xl">
            শিক্ষা নগরী — শেখার পথে আপনার সঙ্গী।
          </p>
        </div>
      </article>
    </main>
  );
}
