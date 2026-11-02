import type { ReactNode } from "react";
import { Suspense } from "react";
import { AdminLayoutShell } from "@/components/admin-layout-shell";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </Suspense>
  );
}
