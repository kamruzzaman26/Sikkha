import "server-only";

import { cache } from "react";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import { getPublicSiteOrigin } from "@/lib/supabase/env";

/** Everything the site manager can configure under Admin → Website Settings. */
export type GeneralSettings = {
  siteName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  contactEmail: string;
  contactPhone: string;
  helpline: string;
  whatsapp: string;
  businessHours: string;
  address: string;
  currency: string;
  topNote: string;
  announcementText: string;
  announcementLink: string;
  footerAbout: string;
  returnPolicy: string;
  social: { facebook: string; instagram: string; youtube: string; tiktok: string; x: string };
};

/** Everything the site manager can configure under Admin → SEO. */
export type SeoSettings = {
  title: string;
  description: string;
  keywords: string;
  preferredDomain: string;
  ogImage: string;
  twitterHandle: string;
  googleVerification: string;
  bingVerification: string;
  analyticsId: string;
  index: boolean;
  follow: boolean;
};

export const DEFAULT_SITE_NAME = "শিক্ষা নগরী";
export const DEFAULT_DESCRIPTION = "বই ও শেখার উপকরণ খুঁজে দেখুন শিক্ষা নগরীতে।";

function str(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type Raw = Record<string, unknown>;

function normalizeGeneral(raw: Raw): GeneralSettings {
  const social = (raw.social ?? {}) as Raw;
  return {
    siteName: str(raw.site_name, 100) || DEFAULT_SITE_NAME,
    tagline: str(raw.tagline, 200),
    logoUrl: str(raw.logo_url),
    faviconUrl: str(raw.favicon_url),
    contactEmail: str(raw.contact_email, 160),
    contactPhone: str(raw.contact_phone, 40),
    helpline: str(raw.helpline, 40),
    whatsapp: str(raw.whatsapp, 40),
    businessHours: str(raw.business_hours, 200),
    address: str(raw.address, 300),
    currency: str(raw.currency, 8) || "BDT",
    topNote: str(raw.delivery_note, 120),
    announcementText: str(raw.announcement_text, 200),
    announcementLink: str(raw.announcement_link),
    footerAbout: str(raw.footer_about, 400),
    returnPolicy: str(raw.return_policy, 500),
    social: {
      facebook: str(social.facebook),
      instagram: str(social.instagram),
      youtube: str(social.youtube),
      tiktok: str(social.tiktok),
      x: str(social.x),
    },
  };
}

function normalizeSeo(raw: Raw): SeoSettings {
  return {
    title: str(raw.title, 70),
    description: str(raw.description, 170),
    keywords: str(raw.keywords),
    preferredDomain: str(raw.canonical_url),
    ogImage: str(raw.og_image),
    twitterHandle: str(raw.twitter_handle, 20),
    googleVerification: str(raw.google_verification, 200),
    bingVerification: str(raw.bing_verification, 200),
    analyticsId: str(raw.analytics_id, 40),
    index: raw.index === undefined ? true : raw.index !== false,
    follow: raw.follow === undefined ? true : raw.follow !== false,
  };
}

/** One query per request, shared by header, footer, metadata and pages. */
export const getSiteSettings = cache(async (): Promise<{ general: GeneralSettings; seo: SeoSettings }> => {
  try {
    const supabase = createSupabasePublicServerClient();
    const { data } = await supabase.from("site_settings").select("key, value").in("key", ["general", "seo"]);
    const byKey = new Map((data ?? []).map((row) => [row.key as string, (row.value ?? {}) as Raw]));
    return {
      general: normalizeGeneral(byKey.get("general") ?? {}),
      seo: normalizeSeo(byKey.get("seo") ?? {}),
    };
  } catch {
    return { general: normalizeGeneral({}), seo: normalizeSeo({}) };
  }
});

/** The public origin: the "preferred domain" setting wins, then NEXT_PUBLIC_SITE_URL. */
export function resolveSiteOrigin(seo: SeoSettings): string | undefined {
  if (seo.preferredDomain) {
    try {
      const url = new URL(seo.preferredDomain);
      if (url.protocol === "https:") return url.origin;
    } catch {
      /* fall through */
    }
  }
  try {
    return getPublicSiteOrigin();
  } catch {
    return undefined;
  }
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

export function whatsappHref(number: string) {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  // Local Bangladeshi numbers (01XXXXXXXXX) become 8801XXXXXXXXX.
  const full = digits.startsWith("01") ? `88${digits}` : digits;
  return `https://wa.me/${full}`;
}
