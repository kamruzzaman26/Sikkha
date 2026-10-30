import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sikkha Nogori | শিক্ষা নগরী",
  description:
    "বই ও শেখার উপকরণ খুঁজে দেখুন Sikkha Nogori-তে।",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className={`${hindSiliguri.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
