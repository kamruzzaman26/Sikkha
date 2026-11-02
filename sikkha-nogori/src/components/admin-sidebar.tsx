import Link from "next/link";
import { adminNav } from "@/lib/admin-nav";

function NavList() {
  return (
    <nav aria-label="অ্যাডমিন নেভিগেশন" className="space-y-5">
      {adminNav.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            {group.title}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="flex min-h-10 items-center justify-between rounded-lg px-3 text-sm text-slate-400"
                  >
                    {item.label}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                      শীঘ্রই
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-3 py-6 lg:block">
        <NavList />
      </aside>
      <details className="group border-b border-slate-200 bg-white lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-sm font-bold text-slate-800">
          অ্যাডমিন মেনু
          <span aria-hidden="true" className="text-slate-500 group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="border-t border-slate-100 px-2 py-4">
          <NavList />
        </div>
      </details>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
