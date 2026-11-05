"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#f7faf8] px-5 py-14 text-slate-900">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-extrabold">কিছু একটা সমস্যা হয়েছে</h1>
        <p className="mt-3 leading-7 text-slate-600">
          পেজটি লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800"
          >
            আবার চেষ্টা করুন
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-5 font-bold text-slate-800 hover:bg-slate-50"
          >
            হোম পেজ
          </Link>
        </div>
      </div>
    </main>
  );
}
