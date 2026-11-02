import type { ReactNode } from "react";
import { AdminNavigation } from "@/components/admin-navigation";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNavigation />
      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
