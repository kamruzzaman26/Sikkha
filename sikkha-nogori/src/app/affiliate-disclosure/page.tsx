import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "অ্যাফিলিয়েট প্রকাশনা | শিক্ষা নগরী",
  description: "Sikkha Nogori-তে affiliate link সম্পর্কে গুরুত্বপূর্ণ তথ্য।",
};

export default function AffiliateDisclosurePage() {
  return (
    <main className="min-h-[60vh] bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <article className="mx-auto max-w-3xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span>অ্যাফিলিয়েট প্রকাশনা</span>
        </nav>
        <header className="mt-7">
          <p className="text-sm font-bold text-emerald-700">গুরুত্বপূর্ণ তথ্য</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            অ্যাফিলিয়েট লিংক সম্পর্কে
          </h1>
        </header>
        <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 leading-8 text-slate-700 shadow-sm sm:p-8">
          <p>
            কিছু পণ্যের লিংক তৃতীয় পক্ষের বিক্রেতার কাছে নিয়ে যেতে পারে। এমন
            লিংকের মাধ্যমে কেনাকাটা হলে Sikkha Nogori কমিশন পেতে পারে।
          </p>
          <p>
            পণ্যের বর্তমান মূল্য, মজুত, বিবরণ, বিক্রয় শর্ত এবং ফেরত নীতি
            সংশ্লিষ্ট বিক্রেতার সাইটে যাচাই করুন। বিক্রেতার সাইটেই অর্ডার ও
            পেমেন্ট সম্পন্ন হয়; affiliate link-কে Sikkha Nogori-র নিজস্ব অর্ডার
            বা পেমেন্ট হিসেবে গণ্য করা হয় না।
          </p>
          <p>
            সব পণ্যের জন্য affiliate link উপলভ্য নয়। কোনো পণ্যের কেনার লিংক না
            থাকলে আমরা বিকল্প URL অনুমান করে তৈরি করি না।
          </p>
        </div>
      </article>
    </main>
  );
}
