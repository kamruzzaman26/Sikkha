import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "গোপনীয়তা নীতি | শিক্ষা নগরী",
  description: "শিক্ষা নগরী কোন তথ্য সংগ্রহ করে এবং কীভাবে ব্যবহার করে।",
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
          <span>গোপনীয়তা নীতি</span>
        </nav>
        <header className="mt-7">
          <h1 className="text-3xl font-extrabold sm:text-4xl">গোপনীয়তা নীতি</h1>
        </header>
        <div className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 leading-8 text-slate-700 shadow-sm sm:p-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900">আমরা কী তথ্য সংগ্রহ করি</h2>
            <p className="mt-2">
              অ্যাকাউন্ট খুললে আপনার ইমেইল ঠিকানা ও নাম (যদি দেন) সংরক্ষণ করা হয়। উইশলিস্টের মতো সুবিধা ব্যবহার করলে আপনার সংরক্ষিত তালিকাও জমা থাকে। যোগাযোগ করলে আপনার পাঠানো বার্তা আমরা দেখতে পাই।
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900">তথ্য কীভাবে ব্যবহার হয়</h2>
            <p className="mt-2">
              সাইন-ইন, আপনার অ্যাকাউন্ট পরিচালনা এবং সাইটের সেবা দিতে তথ্য ব্যবহার হয়। আমরা আপনার ব্যক্তিগত তথ্য বিক্রি করি না।
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900">তৃতীয় পক্ষের সেবা</h2>
            <p className="mt-2">
              অ্যাকাউন্ট ও ডেটা সংরক্ষণে আমরা Supabase ব্যবহার করি। বইয়ের কেনার লিংক রকমারি বা অন্য পার্টনারের সাইটে নিয়ে যেতে পারে; সেখানে তাদের নিজস্ব গোপনীয়তা নীতি প্রযোজ্য হয়। বিস্তারিত জানতে <Link href="/affiliate-disclosure" className="font-semibold text-emerald-800 hover:underline">অ্যাফিলিয়েট প্রকাশনা</Link> দেখুন।
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900">কুকি</h2>
            <p className="mt-2">
              সাইন-ইন অবস্থা ধরে রাখতে আমরা কুকি ব্যবহার করি। ব্রাউজার সেটিংসে কুকি বন্ধ করলে সাইন-ইন কাজ নাও করতে পারে।
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900">আপনার অধিকার</h2>
            <p className="mt-2">
              আপনার তথ্য দেখতে, সংশোধন করতে বা অ্যাকাউন্ট মুছে ফেলতে চাইলে <Link href="/contact" className="font-semibold text-emerald-800 hover:underline">যোগাযোগ</Link> পেজের মাধ্যমে জানান।
            </p>
          </section>
          <p className="text-sm text-slate-500">এই নীতি সময়ে সময়ে হালনাগাদ হতে পারে।</p>
        </div>
      </article>
    </main>
  );
}
