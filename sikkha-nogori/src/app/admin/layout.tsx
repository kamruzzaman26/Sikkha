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
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.rpc("is_admin");
      isAdmin = data === true;
    }
  } catch {
    isAdmin = false;
  }

  return isAdmin && user ? (
    <AdminShell
      identity={{
        email: user.email,
        name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null,
        avatarUrl: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
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
