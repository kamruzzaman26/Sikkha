import "server-only";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SiteIdentity = {
  displayName: string;
  email: string;
  hasOrders: boolean;
  isAdmin: boolean;
} | null;

async function getSiteIdentity(): Promise<SiteIdentity> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && userError.name !== "AuthSessionMissingError") {
    throw new Error("Unable to verify the signed-in user for navigation.", {
      cause: userError,
    });
  }
  if (!user) {
    return null;
  }

  const metadataName = user.user_metadata?.display_name;
  const emailName = user.email?.split("@")[0];

  return {
    displayName:
      (typeof metadataName === "string" ? metadataName.trim() : "") ||
      emailName ||
      "গ্রাহক",
    email: user.email ?? "",
    hasOrders: false,
    isAdmin: false,
  };
}

async function AuthenticatedSiteHeader() {
  await connection();
  const identity = await getSiteIdentity();
  return <SiteHeader identity={identity} />;
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<SiteHeader identity={null} />}>
        <AuthenticatedSiteHeader />
      </Suspense>
      {children}
      <SiteFooter />
    </>
  );
}
