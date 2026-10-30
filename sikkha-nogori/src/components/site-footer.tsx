import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "আমাদের সম্পর্কে" },
  { href: "/contact", label: "যোগাযোগ" },
  { href: "/blog", label: "ব্লগ" },
  { href: "/books", label: "বইয়ের সংগ্রহ" },
  { href: "/affiliate-disclosure", label: "অ্যাফিলিয়েট প্রকাশনা" },
  { href: "/admin/login", label: "অ্যাডমিন লগইন" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-[#073f33] text-emerald-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:grid-cols-2 sm:px-6 sm:py-11 lg:grid-cols-[1.4fr_1fr] lg:px-8">
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
          <p className="mt-3 max-w-md text-sm leading-7 text-emerald-100/85">
            বই ও শেখার উপকরণ খুঁজে দেখুন—তথ্য ও প্রাপ্যতা সংশ্লিষ্ট প্রকাশক বা
            বিক্রেতার কাছে যাচাই করুন।
          </p>
        </div>
        <nav aria-label="ফুটার নেভিগেশন">
          <h2 className="font-bold text-white">সহায়তা ও তথ্য</h2>
          <ul className="mt-3 grid gap-2.5 text-sm text-emerald-100/85 sm:grid-cols-2">
            {footerLinks.map((item) => (
              <li key={item.href}>
                <Link
                  className="rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-emerald-100/75">
        <p>বিক্রেতার পৃষ্ঠায় মূল্য, মজুত ও পণ্যের বিবরণ যাচাই করুন।</p>
      </div>
    </footer>
  );
}
