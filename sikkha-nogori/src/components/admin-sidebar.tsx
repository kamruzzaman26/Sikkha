"use client";

import Link from "next/link";
import { useRef } from "react";
import { AdminIcon } from "@/components/admin-icons";
import { AdminNavLink } from "@/components/admin-nav-link";
import { adminNav } from "@/lib/admin-nav";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin navigation" className="space-y-7">
      {adminNav.map((group) => (
        <section key={group.title}>
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-200/80">{group.title}</p>
          <ul className="mt-3 space-y-1">
            {group.items.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <details className="group/partner">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10">
                      <AdminIcon name={item.icon} className="size-[18px] shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <AdminIcon name="chevron" className="size-4 transition group-open/partner:rotate-180" />
                    </summary>
                    <ul className="ml-5 mt-1 space-y-1 border-l border-white/15 pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <div onClick={onNavigate}><AdminNavLink href={child.href} label={child.label} icon="chevron" /></div>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : item.href ? (
                  <div onClick={onNavigate}><AdminNavLink href={item.href} label={item.label} icon={item.icon} /></div>
                ) : (
                  <span aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-300/65">
                    <AdminIcon name={item.icon} className="size-[18px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300/60">Soon</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-2xl px-2 py-3">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-blue-400 text-lg font-black text-slate-950 shadow-lg shadow-black/10">SN</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold tracking-wide text-white">SIKKHA NOGORI</span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">Admin workspace</span>
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const closeMobileMenu = () => mobileMenuRef.current?.removeAttribute("open");

  return (
    <div lang="en" className="min-h-screen bg-[#f4f6fb] lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[276px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#101b35] px-4 py-5 text-white lg:flex">
        <Brand />
        <div className="my-5 h-px bg-white/10" />
        <NavList />
        <div className="mt-auto pt-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-white">Sikkha Nogori</p>
            <p className="mt-1 text-[11px] leading-5 text-blue-100/75">Manage your store, catalog, customers, and partners from one place.</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <details ref={mobileMenuRef} className="group sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur lg:hidden">
          <summary className="flex min-h-[62px] cursor-pointer list-none items-center gap-3 px-4">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#1d376b] text-xs font-black text-white">SN</span>
            <span className="flex-1">
              <span className="block text-sm font-extrabold tracking-wide text-slate-900">SIKKHA NOGORI</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Admin workspace</span>
            </span>
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-900"><AdminIcon name="menu" /></span>
          </summary>
          <div className="fixed inset-x-0 bottom-0 top-[62px] z-40 bg-slate-950/60 backdrop-blur-[2px]" onClick={closeMobileMenu}>
            <button type="button" aria-label="Close navigation" className="absolute inset-0 size-full cursor-default" />
          </div>
          <div className="fixed bottom-0 left-0 top-[62px] z-50 w-[min(86vw,340px)] overflow-y-auto border-r border-slate-200 bg-[#101b35] px-3 py-5 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-200">Navigation</span>
              <button type="button" onClick={closeMobileMenu} aria-label="Close menu" className="flex size-9 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10"><AdminIcon name="menu" /></button>
            </div>
            <div onClick={(event) => { if ((event.target as HTMLElement).closest("a")) closeMobileMenu(); }}>
              <NavList onNavigate={closeMobileMenu} />
            </div>
          </div>
        </details>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
