import { AdminIcon } from "@/components/admin-icons";
import { AdminNavLink } from "@/components/admin-nav-link";
import { adminNav } from "@/lib/admin-nav";

function NavList() {
  return (
    <nav aria-label="অ্যাডমিন নেভিগেশন" className="space-y-5">
      {adminNav.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-500">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <AdminNavLink href={item.href} label={item.label} icon={item.icon} />
                ) : (
                  <span aria-disabled="true" className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-400">
                    <AdminIcon name={item.icon} className="size-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">শীঘ্রই</span>
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
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-5 text-sm font-bold text-slate-800">
          <AdminIcon name="menu" className="size-5 text-slate-600" />
          <span className="flex-1">অ্যাডমিন মেনু</span>
          <AdminIcon name="chevron" className="size-5 text-slate-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-100 px-2 py-4"><NavList /></div>
      </details>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
