"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminIcon, type AdminIconName } from "@/components/admin-icons";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavLink({ href, label, icon }: { href: string; label: string; icon: AdminIconName }) {
  const pathname = usePathname();
  const active = pathname ? isActive(pathname, href) : false;

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-emerald-700 ${active ? "bg-emerald-100 text-emerald-950" : "text-slate-800 hover:bg-emerald-50 hover:text-emerald-900"}`}>
      <AdminIcon name={icon} className={`size-5 shrink-0 ${active ? "text-emerald-800" : "text-slate-500"}`} />
      {label}
    </Link>
  );
}
