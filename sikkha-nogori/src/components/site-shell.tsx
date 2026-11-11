import "server-only";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { SiteAnalytics } from "@/components/site-analytics";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getSiteSettings, resolveSiteOrigin, whatsappHref } from "@/lib/site-settings";
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

  const [{ data: adminMembership, error: adminError }, { count: orderCount, error: ordersError }] = await Promise.all([
    supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (adminError) {
    throw new Error("Unable to load the account's admin membership.", { cause: adminError });
  }
  if (ordersError) {
    throw new Error("Unable to load the account's order status.", { cause: ordersError });
  }

  return {
    displayName:
      (typeof metadataName === "string" ? metadataName.trim() : "") ||
      emailName ||
      "গ্রাহক",
    email: user.email ?? "",
    hasOrders: (orderCount ?? 0) > 0,
    isAdmin: adminMembership?.role === "admin",
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
      return { books: [], products: [], courses: [] };
    }
    return {
      books: buildCategoryMenu(data, "books"),
      products: [
        ...buildCategoryMenu(data, "products"),
        ...buildCategoryMenu(data, "electronics"),
      ],
      courses: buildCategoryMenu(data, "courses"),
    };
  } catch {
    return { books: [], products: [] };
  }
}

async function getTopBar() {
  const { general } = await getSiteSettings();
  return {
    helpline: general.helpline,
    note: general.topNote,
    brandName: general.siteName,
    tagline: general.tagline,
    logoUrl: general.logoUrl,
    announcement: general.announcementText,
    announcementLink: general.announcementLink,
  };
}

async function AsyncFooter() {
  await connection();
  const { general } = await getSiteSettings();
  return <SiteFooter settings={general} year={new Date().getFullYear()} />;
}

/** Search-engine structured data (organisation + site search) and analytics. */
async function SiteExtras() {
  await connection();
  const { general, seo } = await getSiteSettings();
  const origin = resolveSiteOrigin(seo);
  const sameAs = Object.values(general.social).filter(Boolean);
  const jsonLd = origin && {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: general.siteName,
        url: origin,
        ...(general.logoUrl ? { logo: general.logoUrl } : {}),
        ...(sameAs.length ? { sameAs } : {}),
        ...(general.contactEmail || general.contactPhone
          ? { contactPoint: { "@type": "ContactPoint", contactType: "customer support", ...(general.contactEmail ? { email: general.contactEmail } : {}), ...(general.contactPhone ? { telephone: general.contactPhone } : {}), availableLanguage: ["bn", "en"] } }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: general.siteName,
        inLanguage: "bn",
        publisher: { "@id": `${origin}/#organization` },
        potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${origin}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" },
      },
    ],
  };
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      {seo.analyticsId && <SiteAnalytics id={seo.analyticsId} />}
      {general.whatsapp && <WhatsAppButton href={whatsappHref(general.whatsapp)} />}
    </>
  );
}

async function AuthenticatedSiteHeader() {
  await connection();
  const [identity, categoryMenu, topBar] = await Promise.all([
    getSiteIdentity(),
    getCategoryMenu(),
    getTopBar(),
  ]);
  return <SiteHeader identity={identity} categoryMenu={categoryMenu} topBar={topBar} />;
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <SiteChrome
      header={
        <Suspense fallback={<SiteHeader identity={null} />}>
          <AuthenticatedSiteHeader />
        </Suspense>
      }
      footer={
        <Suspense fallback={<SiteFooter />}>
          <AsyncFooter />
        </Suspense>
      }
    >
      <Suspense fallback={null}>
        <SiteExtras />
      </Suspense>
      {children}
    </SiteChrome>
  );
}
