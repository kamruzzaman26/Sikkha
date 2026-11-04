"use client";

import Link from "next/link";
import { useRef } from "react";
import { AdminIcon } from "@/components/admin-icons";
import { AdminNavLink } from "@/components/admin-nav-link";
import { adminNav } from "@/lib/admin-nav";

function NavList() {
  return (
    <nav aria-label="Admin navigation" className="space-y-7">
      {adminNav.map((group) => (
        <section key={group.title}>
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-200/60">{group.title}</p>
          <ul className="mt-3 space-y-1">
            {group.items.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <AdminNavLink href={item.href} label={item.label} icon={item.icon} />
                ) : (
                  <span aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-emerald-100/45">
                    <AdminIcon name={item.icon} className="size-[18px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-100/60">Soon</span>
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
      <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-300 text-lg font-black text-[#073c32] shadow-lg shadow-black/10">SN</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold tracking-wide text-white">SIKKHA NOGORI</span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/65">Admin workspace</span>
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  return (
    <div lang="en" className="min-h-screen bg-[#f3f7f5] lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[276px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#082f29] px-4 py-5 text-white lg:flex">
        <Brand />
        <div className="my-5 h-px bg-white/10" />
        <NavList />
        <div className="mt-auto pt-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-white">Sikkha Nogori</p>
            <p className="mt-1 text-[11px] leading-5 text-emerald-100/60">Manage your store, catalog, customers, and partners from one place.</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <details ref={mobileMenuRef} className="group sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur lg:hidden">
          <summary className="flex min-h-[62px] cursor-pointer list-none items-center gap-3 px-4">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#0a5748] text-xs font-black text-white">SN</span>
            <span className="flex-1">
              <span className="block text-sm font-extrabold tracking-wide text-slate-900">SIKKHA NOGORI</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Admin workspace</span>
            </span>
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900"><AdminIcon name="menu" /></span>
          </summary>
          <div
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) {
                mobileMenuRef.current?.removeAttribute("open");
              }
            }}
            className="max-h-[75vh] overflow-y-auto border-t border-slate-100 bg-[#082f29] px-3 py-5 text-white"
          >
            <NavList />
          </div>
        </details>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
