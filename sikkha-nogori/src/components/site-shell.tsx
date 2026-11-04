import "server-only";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import {
  createSupabasePublicServerClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { buildCategoryMenu } from "@/lib/category-tree.mjs";
import { isNoActiveSessionError } from "@/lib/supabase/auth-errors";

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

  if (userError && !isNoActiveSessionError(userError)) {
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

async function getCategoryMenu() {
  try {
    const supabase = createSupabasePublicServerClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, parent_id, name, sort_order, category_group")
      .eq("is_active", true)
      .limit(2000);
    if (error || !data) {
      return { books: [], products: [] };
    }
    return {
      books: buildCategoryMenu(data, "books"),
      products: buildCategoryMenu(data, "products"),
    };
  } catch {
    return { books: [], products: [] };
  }
}

async function AuthenticatedSiteHeader() {
  await connection();
  const [identity, categoryMenu] = await Promise.all([
    getSiteIdentity(),
    getCategoryMenu(),
  ]);
  return <SiteHeader identity={identity} categoryMenu={categoryMenu} />;
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <SiteChrome
      header={
        <Suspense fallback={<SiteHeader identity={null} />}>
          <AuthenticatedSiteHeader />
        </Suspense>
      }
      footer={<SiteFooter />}
    >
      {children}
    </SiteChrome>
  );
}
