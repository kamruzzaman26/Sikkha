import type { Metadata, Viewport } from "next";
import { Hind_Siliguri } from "next/font/google";
import { SiteShell } from "@/components/site-shell";
import { DEFAULT_DESCRIPTION, getSiteSettings, resolveSiteOrigin } from "@/lib/site-settings";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { general, seo } = await getSiteSettings();
  const title = seo.title || `${general.siteName} | বই ও শেখার উপকরণ`;
  const description = seo.description || general.tagline || DEFAULT_DESCRIPTION;
  const origin = resolveSiteOrigin(seo);
  const handle = seo.twitterHandle ? `@${seo.twitterHandle.replace(/^@/, "")}` : undefined;
  return {
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    title,
    description,
    applicationName: general.siteName,
    ...(seo.keywords ? { keywords: seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) } : {}),
    robots: { index: seo.index, follow: seo.follow },
    // Every page gets its own canonical address (its own path, no query).
    alternates: { canonical: "./" },
    openGraph: {
      type: "website",
      siteName: general.siteName,
      locale: "bn_BD",
      title,
      description,
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    },
    twitter: {
      card: seo.ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(handle ? { site: handle } : {}),
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    },
    ...(general.faviconUrl ? { icons: { icon: general.faviconUrl } } : {}),
    verification: {
      ...(seo.googleVerification ? { google: seo.googleVerification } : {}),
      ...(seo.bingVerification ? { other: { "msvalidate.01": seo.bingVerification } } : {}),
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className={`${hindSiliguri.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
