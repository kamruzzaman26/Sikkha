import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";

export const instant = false;

type PublicPage = { title: string; slug: string; content: string; status: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabasePublicServerClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "pages").maybeSingle();
  const pages = Array.isArray(data?.value) ? data.value as PublicPage[] : [];
  const page = pages.find((item) => item.slug === slug && item.status === "published");
  return page
    ? { title: page.title, robots: { index: true, follow: true } }
    : { title: "Page not found", robots: { index: false, follow: false } };
}

export default async function PublicPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabasePublicServerClient();
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", "pages").maybeSingle();
  if (error) throw new Error("Unable to load this page.", { cause: error });
  const pages = Array.isArray(data?.value) ? data.value as PublicPage[] : [];
  const page = pages.find((item) => item.slug === slug && item.status === "published");
  if (!page) notFound();

  return (
    <main lang="bn" className="min-h-[60vh] bg-[#f7faf8] px-5 py-12 text-slate-900 sm:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-bold text-emerald-800 hover:underline">← শিক্ষা নগরী</Link>
        <h1 className="mt-7 text-3xl font-extrabold sm:text-4xl">{page.title}</h1>
        <div className="mt-7 whitespace-pre-wrap text-base leading-8 text-slate-700">{page.content}</div>
      </article>
    </main>
  );
}
