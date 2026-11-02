import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ব্যবহারের শর্তাবলি | শিক্ষা নগরী",
  description: "শিক্ষা নগরী ব্যবহারের শর্ত, ডেলিভারি ও ফেরত সংক্রান্ত তথ্য।",
};

export default function Page() {
  return (
    <main className="min-h-[60vh] bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <article className="mx-auto max-w-3xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span>ব্যবহারের শর্তাবলি</span>
        </nav>
        <header className="mt-7">
          <h1 className="text-3xl font-extrabold sm:text-4xl">ব্যবহারের শর্তাবলি</h1>
        </header>
        <div className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 leading-8 text-slate-700 shadow-sm sm:p-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900">সাইটের পরিচয়</h2>
            <p className="mt-2">
              শিক্ষা নগরী একটি বই ও শেখার উপকরণের ক্যাটালগ। আমরা বই খুঁজে পেতে সাহায্য করি; বিক্রয়, পেমেন্ট ও ডেলিভারি সংশ্লিষ্ট বিক্রেতার সাইটে সম্পন্ন হয়।
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900">মূল্য ও প্রাপ্যতা</h2>
            <p className="mt-2">
              এখানে দেখানো মূল্য, ছাড় ও মজুত তথ্য পরিবর্তিত হতে পারে। কেনার আগে বিক্রেতার সাইটে চূড়ান্ত তথ্য যাচাই করুন।
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900">ডেলিভারি ও ফেরত</h2>
            <p className="mt-2">
              অ্যাফিলিয়েট লিংকের মাধ্যমে কেনা পণ্যের ডেলিভারি, ফেরত ও রিফান্ড নীতি সংশ্লিষ্ট বিক্রেতার নীতি অনুযায়ী হয়। এসব বিষয়ে শিক্ষা নগরী দায়ী নয়।
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900">অ্যাকাউন্ট ও ব্যবহার</h2>
            <p className="mt-2">
              আপনার অ্যাকাউন্টের তথ্য নিরাপদ রাখা আপনার দায়িত্ব। সাইটের অপব্যবহার বা বিঘ্ন সৃষ্টির চেষ্টা করলে অ্যাকাউন্ট বন্ধ হতে পারে।
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900">কন্টেন্ট</h2>
            <p className="mt-2">
              বইয়ের নাম, প্রচ্ছদ ও বিবরণের স্বত্ব সংশ্লিষ্ট লেখক, প্রকাশক বা বিক্রেতার। কোনো আপত্তি থাকলে <Link href="/contact" className="font-semibold text-emerald-800 hover:underline">যোগাযোগ</Link> করুন।
            </p>
          </section>
          <p className="text-sm text-slate-500">এই শর্ত সময়ে সময়ে হালনাগাদ হতে পারে।</p>
        </div>
      </article>
    </main>
  );
}
