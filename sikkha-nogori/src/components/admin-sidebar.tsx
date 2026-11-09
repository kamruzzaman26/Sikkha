"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminIcon } from "@/components/admin-icons";
import { AdminNavLink } from "@/components/admin-nav-link";
import { adminNav } from "@/lib/admin-nav";

function NavList({ onSelect }: { onSelect?: (href: string) => void }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Admin navigation" className="space-y-6">
      {adminNav.map((group) => (
        <section key={group.title}>
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{group.title}</p>
          <ul className="mt-2.5 space-y-1">
            {group.items.map((item) => {
              const childActive = item.children?.some(
                (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
              );
              return (
                <li key={item.label}>
                  {item.children ? (
                    <details className="group/partner" open={childActive || undefined}>
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl px-3 text-[13.5px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden">
                        <AdminIcon name={item.icon} className="size-[18px] shrink-0 text-slate-400" />
                        <span className="flex-1">{item.label}</span>
                        <AdminIcon name="chevron" className="size-4 transition group-open/partner:rotate-180" />
                      </summary>
                      <ul className="ml-5 mt-1 space-y-1 border-l border-white/10 pl-3">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <AdminNavLink href={child.href} label={child.label} onSelect={onSelect} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : item.href ? (
                    <AdminNavLink href={item.href} label={item.label} icon={item.icon} onSelect={onSelect} />
                  ) : (
                    <span aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-500">
                      <AdminIcon name={item.icon} className="size-[18px] shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">Soon</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function Brand({ onSelect }: { onSelect?: (href: string) => void }) {
  return (
    <Link
      href="/admin/dashboard"
      onClick={() => onSelect?.("/admin/dashboard")}
      className="flex items-center gap-3 rounded-2xl px-2 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-base font-extrabold text-white shadow-md shadow-black/20">SN</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold tracking-wide text-white">SIKKHA NOGORI</span>
        <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Admin workspace</span>
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  // The drawer is open only for the page it was opened on, so it closes by
  // itself as soon as navigation completes.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenAt(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Tapping the page you are already on never navigates, so close right away.
  const closeIfSamePage = (href: string) => {
    if (href === pathname) setOpenAt(null);
  };

  return (
    <div lang="en" className="min-h-screen bg-canvas lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-ink-900 px-4 py-5 text-white lg:flex">
        <Brand />
        <div className="my-5 h-px bg-white/10" />
        <NavList />
        <div className="mt-auto pt-8">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-white">Sikkha Nogori</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">Manage your store, catalog, customers, and partners from one place.</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[60px] items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-700 text-xs font-extrabold text-white">SN</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold tracking-wide text-slate-900">SIKKHA NOGORI</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Admin workspace</span>
          </span>
          <button
            type="button"
            onClick={() => setOpenAt(pathname)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="admin-mobile-menu"
            className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 transition hover:bg-slate-50 active:scale-95"
          >
            <AdminIcon name="menu" />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpenAt(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            />
            <div
              id="admin-mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Admin menu"
              className="absolute inset-y-0 left-0 flex w-[88%] max-w-[330px] flex-col bg-ink-900 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <Brand onSelect={closeIfSamePage} />
                <button
                  type="button"
                  onClick={() => setOpenAt(null)}
                  aria-label="Close menu"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-5">
                <NavList onSelect={closeIfSamePage} />
              </div>
            </div>
          </div>
        )}

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
