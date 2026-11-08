"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AdminIcon } from "@/components/admin-icons";
import { AdminNavLink } from "@/components/admin-nav-link";
import { adminNav } from "@/lib/admin-nav";

type AdminIdentity = { email?: string | null; name?: string | null; avatarUrl?: string | null };

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
      <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-300 to-blue-600 text-lg font-black text-white shadow-lg shadow-black/10">SN</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold tracking-wide text-white">SIKKHA NOGORI</span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">Admin workspace</span>
      </span>
    </Link>
  );
}

function AdminTopbar({ identity }: { identity: AdminIdentity }) {
  const displayName = identity.name || identity.email?.split("@")[0] || "Administrator";
  const initials = displayName.slice(0, 2).toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-end gap-3 border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-7">
      <details className="relative">
        <summary aria-label="Notifications" className="flex size-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 [&::-webkit-details-marker]:hidden">
          <AdminIcon name="bell" className="size-[19px]" />
        </summary>
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-bold text-slate-900">Notifications</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">There are no new notifications.</p>
        </div>
      </details>
      <details className="relative">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-left transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          {identity.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={identity.avatarUrl} alt="" className="size-9 rounded-lg object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#1d376b] text-xs font-extrabold text-white">{initials}</span>
          )}
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-40 truncate text-xs font-bold text-slate-900">{displayName}</span>
            <span className="block max-w-40 truncate text-[10px] text-slate-500">{identity.email || "Admin account"}</span>
          </span>
          <AdminIcon name="chevron" className="size-4 text-slate-500" />
        </summary>
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-bold text-slate-900">{displayName}</p>
          <p className="mt-1 break-all text-xs text-slate-500">{identity.email || "Administrator account"}</p>
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] font-semibold text-blue-800">Sikkha Nogori Admin</p>
        </div>
      </details>
    </header>
  );
}

export function AdminShell({ children, identity }: { children: React.ReactNode; identity: AdminIdentity }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  return (
    <div lang="en" className="min-h-screen bg-[#f4f6fb] lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[276px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#0d1933] px-4 py-5 text-white lg:flex">
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
        <div className="sticky top-0 z-30 flex min-h-[62px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" aria-expanded={mobileOpen} className="flex size-10 items-center justify-center rounded-xl bg-[#1d376b] text-white">
            <AdminIcon name="menu" />
          </button>
          <span className="text-xs font-extrabold tracking-wide text-slate-900">SIKKHA NOGORI</span>
          <span className="size-10" />
        </div>
        <AdminTopbar identity={identity} />
        <main className="min-w-0">{children}</main>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 size-full bg-slate-950/60 backdrop-blur-sm" />
          <aside className="absolute bottom-0 left-0 top-0 w-[min(86vw,340px)] overflow-y-auto overscroll-contain border-r border-white/10 bg-[#0d1933] px-4 py-5 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10"><AdminIcon name="x" /></button>
            </div>
            <NavList onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
