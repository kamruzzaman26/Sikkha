"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AdminIcon, type AdminIconName } from "@/components/admin-icons";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavLink({ href, label, icon }: { href: string; label: string; icon: AdminIconName }) {
  const pathname = usePathname();
  const active = pathname ? isActive(pathname, href) : false;
  const [pending, setPending] = useState(false);
  return (
    <Link href={href} aria-current={active ? "page" : undefined} aria-busy={pending || undefined}
      onClick={() => { if (!active) setPending(true); }}
      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${active ? "bg-blue-400 text-slate-950 shadow-lg shadow-black/10" : "text-slate-100/80 hover:bg-white/[0.09] hover:text-white"}`}>
      <AdminIcon name={icon} className={`size-[18px] shrink-0 ${active ? "text-slate-950" : "text-blue-100/70 group-hover:text-blue-200"}`} />
      <span className="flex-1">{label}</span>
      {pending ? <span aria-label="Loading" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : active && <span className="size-1.5 rounded-full bg-slate-950" />}
    </Link>
  );
}
