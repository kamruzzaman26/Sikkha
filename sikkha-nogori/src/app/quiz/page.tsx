import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "শিক্ষা কুইজ ও প্রতিযোগিতা | শিক্ষা নগরী",
  description: "শিক্ষার্থীদের জন্য শিক্ষা কুইজ ও প্রতিযোগিতার বিভাগ।",
};

export default function QuizPage() {
  return (
    <main className="min-h-[65vh] bg-[#f6f8f7] px-4 py-10 text-slate-900 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 px-6 py-10 text-white sm:px-10 sm:py-14">
          <p className="text-sm font-semibold text-emerald-100">শিক্ষা নগরী · Learning</p>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">শিক্ষা কুইজ ও প্রতিযোগিতা</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50">জ্ঞান যাচাই, শেখার অনুশীলন এবং শিক্ষামূলক প্রতিযোগিতার জন্য আলাদা বিভাগ।</p>
        </div>
        <section className="px-6 py-8 sm:px-10">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-lg font-bold text-amber-950">কুইজ কার্যক্রম প্রস্তুত করা হচ্ছে</h2>
            <p className="mt-2 text-sm leading-7 text-amber-900">কুইজ ও প্রতিযোগিতা চালু হলে এখানে নিয়ম, বিষয়, অংশগ্রহণ এবং ফলাফল দেখা যাবে। এটি বইয়ের ক্যাটাগরি নয়—তাই বইয়ের খালি তালিকা দেখানো হচ্ছে না।</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/books" className="inline-flex min-h-11 items-center rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-900">বই দেখুন</Link>
            <Link href="/courses" className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">কোর্স দেখুন</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
