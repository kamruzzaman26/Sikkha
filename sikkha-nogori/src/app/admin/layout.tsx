import { Suspense } from "react";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin-sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// The sidebar is only shown to a verified admin. Every admin page still calls
// requireAdmin() itself, so this layout is presentation only, not the security
// boundary.
async function AdminChrome({ children }: { children: React.ReactNode }) {
  await connection();
  let isAdmin = false;
  let adminUser: { email?: string; user_metadata?: Record<string, unknown> } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      adminUser = user;
      const { data } = await supabase.rpc("is_admin");
      isAdmin = data === true;
    }
  } catch {
    isAdmin = false;
  }

  return isAdmin && adminUser ? (
    <AdminShell
      identity={{
        email: adminUser.email,
        name: typeof adminUser.user_metadata?.full_name === "string" ? adminUser.user_metadata.full_name : typeof adminUser.user_metadata?.name === "string" ? adminUser.user_metadata.name : null,
        avatarUrl: typeof adminUser.user_metadata?.avatar_url === "string" ? adminUser.user_metadata.avatar_url : typeof adminUser.user_metadata?.picture === "string" ? adminUser.user_metadata.picture : null,
      }}
    >
      {children}
    </AdminShell>
  ) : <>{children}</>;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div data-admin-route>
      <Suspense fallback={<div className="min-h-screen bg-[#f4f6fb]" />}>
        <AdminChrome>{children}</AdminChrome>
      </Suspense>
    </div>
  );
}
