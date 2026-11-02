"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/admin/overview", label: "ড্যাশবোর্ড", description: "সার্বিক চিত্র" },
  { href: "/admin", label: "পণ্য ও লিংক", description: "ক্যাটালগ পরিচালনা" },
  { href: "/admin/orders", label: "অর্ডার", description: "অর্ডার ও রিফান্ড" },
  { href: "/admin/payments", label: "পেমেন্ট", description: "পেমেন্ট পদ্ধতি" },
  { href: "/admin/affiliates", label: "অ্যাফিলিয়েট", description: "আবেদন ও অ্যাকাউন্ট" },
  { href: "/admin/users", label: "গ্রাহক", description: "গ্রাহক অ্যাকাউন্ট" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavigation() {
  const pathname = usePathname();

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <Link href="/admin/overview" className="block text-base font-extrabold text-slate-950">
          শিক্ষা নগরী <span className="font-semibold text-emerald-700">· Admin</span>
        </Link>
        <nav aria-label="অ্যাডমিন নেভিগেশন" className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-100 px-6 py-6">
          <Link href="/admin/overview" className="block text-lg font-extrabold text-slate-950">
            শিক্ষা নগরী
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Administration
          </p>
        </div>
        <nav aria-label="অ্যাডমিন নেভিগেশন" className="flex-1 space-y-1 px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Workspace
          </p>
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-xs ${active ? "text-emerald-700" : "text-slate-400"}`}>
                  {active ? "●" : "›"}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-xs font-medium text-slate-500">শুধু অনুমোদিত প্রশাসকদের জন্য</p>
        </div>
      </aside>
    </>
  );
}
