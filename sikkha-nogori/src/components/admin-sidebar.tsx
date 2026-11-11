"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

function Dropdown({ id, open, setOpen, trigger, label, triggerClass, children }: {
  id: string; open: string | null; setOpen: (v: string | null) => void;
  trigger: React.ReactNode; label: string; triggerClass: string; children: React.ReactNode;
}) {
  const isOpen = open === id;
  return (
    <div className="relative" data-dropdown>
      <button type="button" aria-label={label} aria-expanded={isOpen} aria-haspopup="true" onClick={() => setOpen(isOpen ? null : id)} className={triggerClass}>{trigger}</button>
      {isOpen && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}

function AdminTopbar({ identity, onMenuClick }: { identity: AdminIdentity; onMenuClick: () => void }) {
  const displayName = identity.name || identity.email?.split("@")[0] || "Administrator";
  const initials = displayName.slice(0, 2).toUpperCase();
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => { if (!(e.target as HTMLElement).closest("[data-dropdown]")) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const iconBtn = "flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-blue-50 hover:text-blue-800";
  return (
    <header className="sticky top-0 z-40 flex min-h-[64px] items-center gap-2 border-b border-slate-200/80 bg-white/95 px-3 shadow-sm backdrop-blur sm:min-h-[72px] sm:px-7">
      <button type="button" onClick={onMenuClick} aria-label="Open navigation menu" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1d376b] text-white lg:hidden"><AdminIcon name="menu" /></button>
      <div className="ml-auto flex items-center gap-2">
        <Dropdown id="bell" open={open} setOpen={setOpen} label="Notifications" triggerClass={iconBtn} trigger={<AdminIcon name="bell" className="size-[19px]" />}>
          <p className="text-sm font-bold text-slate-900">Notifications</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">There are no new notifications.</p>
        </Dropdown>
        <Dropdown id="profile" open={open} setOpen={setOpen} label="Account menu" triggerClass="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-2 text-left transition hover:bg-slate-50 sm:pr-3"
          trigger={<>
            {identity.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={identity.avatarUrl} alt="" className="size-8 rounded-lg object-cover" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#1d376b] text-xs font-extrabold text-white">{initials}</span>
            )}
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-36 truncate text-xs font-bold text-slate-900">{displayName}</span>
              <span className="block max-w-36 truncate text-[10px] text-slate-500">{identity.email || "Admin account"}</span>
            </span>
            <AdminIcon name="chevron" className="size-4 text-slate-500" />
          </>}>
          <p className="text-sm font-bold text-slate-900">{displayName}</p>
          <p className="mt-1 break-all text-xs text-slate-500">{identity.email || "Administrator account"}</p>
          <Link href="/" className="mt-3 block rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50">View storefront</Link>
        </Dropdown>
      </div>
    </header>
  );
}

export function AdminShell({ children, identity }: { children: React.ReactNode; identity: AdminIdentity }) {
  const pathname = usePathname() ?? "";
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
        <AdminTopbar key={pathname} identity={identity} onMenuClick={() => setMobileOpen(true)} />
        <main className="min-w-0">{children}</main>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 size-full bg-slate-950/60 backdrop-blur-sm" />
          <aside className="absolute bottom-0 right-0 top-0 w-[min(86vw,340px)] overflow-y-auto overscroll-contain border-l border-white/10 bg-[#0d1933] px-4 py-5 text-white shadow-2xl">
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
