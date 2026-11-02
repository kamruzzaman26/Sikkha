"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminNavigation } from "@/components/admin-navigation";

export function AdminLayoutShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  return (
    <div className={isLoginPage ? "min-h-screen bg-slate-50" : "min-h-screen bg-slate-50 lg:pl-64"}>
      <AdminNavigation />
      {children}
    </div>
  );
}
