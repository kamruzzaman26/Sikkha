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
    <Link href={href} aria-current={active ? "page" : undefined} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${active ? "bg-emerald-300 text-[#073c32] shadow-lg shadow-black/10" : "text-emerald-50/75 hover:bg-white/[0.08] hover:text-white"}`}>
      <AdminIcon name={icon} className={`size-[18px] shrink-0 ${active ? "text-[#073c32]" : "text-emerald-100/60 group-hover:text-emerald-200"}`} />
      <span className="flex-1">{label}</span>
      {active && <span className="size-1.5 rounded-full bg-[#073c32]" />}
    </Link>
  );
}
