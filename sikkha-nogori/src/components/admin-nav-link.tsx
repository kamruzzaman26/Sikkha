"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { AdminIcon, type AdminIconName } from "@/components/admin-icons";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Must render inside <Link>: shows a spinner while the next page is loading.
function PendingSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      role="status"
      aria-label="Loading"
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function AdminNavLink({
  href,
  label,
  icon,
  onSelect,
}: {
  href: string;
  label: string;
  icon?: AdminIconName;
  onSelect?: (href: string) => void;
}) {
  const pathname = usePathname();
  const active = pathname ? isActive(pathname, href) : false;
  return (
    <Link
      href={href}
      onClick={() => onSelect?.(href)}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 active:scale-[0.99] ${
        active
          ? "bg-brand-600 text-white shadow-md shadow-black/20"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon ? (
        <AdminIcon
          name={icon}
          className={`size-[18px] shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-white"}`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`ml-1 size-1.5 shrink-0 rounded-full ${active ? "bg-white" : "bg-slate-500 group-hover:bg-slate-300"}`}
        />
      )}
      <span className="flex-1">{label}</span>
      <PendingSpinner />
    </Link>
  );
}
