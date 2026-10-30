import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "যোগাযোগ | শিক্ষা নগরী",
  description: "শিক্ষা নগরীর সঙ্গে যোগাযোগের তথ্য।",
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ContactPage() {
  const configuredEmail = process.env.CONTACT_EMAIL?.trim();
  const contactEmail =
    configuredEmail && isValidEmail(configuredEmail)
      ? configuredEmail
      : undefined;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-semibold text-emerald-700">
          ← শিক্ষা নগরী
        </Link>

        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">সহায়তা</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            যোগাযোগ
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            বই, কোর্স, অ্যাফিলিয়েট লিংক বা ওয়েবসাইট সম্পর্কে প্রশ্ন থাকলে
            আমাদের লিখুন।
          </p>
        </header>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {contactEmail ? (
            <>
              <h2 className="text-xl font-bold">ইমেইলে যোগাযোগ</h2>
              <p className="mt-2 leading-7 text-slate-600">
                আপনার ইমেইল অ্যাপ থেকে বার্তা পাঠান:
              </p>
              <a
                href={`mailto:${contactEmail}`}
                className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
              >
                {contactEmail}
              </a>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">যোগাযোগের ঠিকানা সেট করা হয়নি</h2>
              <p className="mt-2 leading-7 text-slate-600">
                সাইট পরিচালকের প্রকৃত যোগাযোগের ইমেইল যোগ না হওয়া পর্যন্ত এখানে
                কোনো যোগাযোগের ঠিকানা দেখানো হবে না। Deploy করার পরিবেশে
                যাচাইকৃত ঠিকানা হিসেবে <code>CONTACT_EMAIL</code> সেট করুন।
              </p>
            </>
          )}
        </section>

        <nav
          aria-label="আরও দেখুন"
          className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-emerald-800"
        >
          <Link href="/books" className="hover:underline">
            বইয়ের সংগ্রহ
          </Link>
          <Link href="/courses" className="hover:underline">
            অনলাইন কোর্স
          </Link>
          <Link href="/blog" className="hover:underline">
            শিক্ষামূলক লেখা
          </Link>
        </nav>
      </div>
    </main>
  );
}
