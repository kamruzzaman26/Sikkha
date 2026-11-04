import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import { SiteShell } from "@/components/site-shell";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createSupabasePublicServerClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle();
  const seo = (data?.value ?? {}) as {
    title?: string; description?: string; canonical_url?: string; og_image?: string;
    index?: boolean; follow?: boolean;
  };
  const title = seo.title || "Sikkha Nogori | শিক্ষা নগরী";
  const description = seo.description || "বই ও শেখার উপকরণ খুঁজে দেখুন Sikkha Nogori-তে।";
  const metadata: Metadata = {
    title,
    description,
    robots: { index: seo.index ?? true, follow: seo.follow ?? true },
  };
  if (seo.canonical_url) metadata.alternates = { canonical: seo.canonical_url };
  if (seo.og_image) metadata.openGraph = { title, description, images: [seo.og_image] };
  return metadata;
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
