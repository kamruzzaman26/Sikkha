import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#f7faf8] px-5 py-14 text-slate-900">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold text-emerald-700">৪০৪</p>
        <h1 className="mt-2 text-3xl font-extrabold">পেজটি পাওয়া যায়নি</h1>
        <p className="mt-3 leading-7 text-slate-600">
          আপনি যে লিংকে এসেছেন সেটি সরানো হয়েছে বা ঠিকানায় ভুল আছে।
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800"
          >
            হোম পেজে যান
          </Link>
          <Link
            href="/books"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-5 font-bold text-slate-800 hover:bg-slate-50"
          >
            বইয়ের সংগ্রহ
          </Link>
        </div>
      </div>
    </main>
  );
}
