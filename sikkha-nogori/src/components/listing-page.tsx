import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { getCollectionBySlug, getListBySlug, type Listing } from "@/lib/merchandising";
import { getSiteSettings } from "@/lib/site-settings";

type Kind = "collection" | "list";
const base: Record<Kind, string> = { collection: "/collections", list: "/lists" };
const load = (kind: Kind, slug: string) => (kind === "collection" ? getCollectionBySlug(slug) : getListBySlug(slug));

export async function listingMetadata(kind: Kind, params: Promise<{ slug: string }>): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const [listing, { general }] = await Promise.all([load(kind, slug), getSiteSettings()]);
  if (!listing) return { title: "পাওয়া যায়নি", robots: { index: false, follow: false } };
  const title = `${listing.title} | ${general.siteName}`;
  const description = (listing.description || `${listing.title} — ${general.siteName}-এর বাছাই করা পণ্য।`).slice(0, 160);
  return {
    title, description,
    alternates: { canonical: `${base[kind]}/${listing.slug}` },
    openGraph: { title, description, url: `${base[kind]}/${listing.slug}`, ...(listing.coverUrl ? { images: [listing.coverUrl] } : {}) },
  };
}

async function Inner({ kind, params }: { kind: Kind; params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const listing: Listing | null = await load(kind, slug);
  if (!listing) notFound();
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-[#006b4f]">হোম</Link> / <span className="text-slate-800">{listing.title}</span>
        </nav>
        <header className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          {listing.coverUrl && <Image src={listing.coverUrl} alt="" width={1400} height={420} priority className="h-40 w-full object-cover sm:h-60" />}
          <div className="p-5 sm:p-7">
            <h1 className="text-2xl font-extrabold text-[#073f33] sm:text-3xl">{listing.title}</h1>
            {listing.description && <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-600">{listing.description}</p>}
            <p className="mt-2 text-sm font-semibold text-slate-700">{listing.products.length}টি পণ্য</p>
          </div>
        </header>
        {listing.products.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-white p-8 text-center text-slate-600">এখনও কোনো পণ্য যুক্ত করা হয়নি।</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {listing.products.map((product) => <li key={product.id}><CatalogProductCard product={product} /></li>)}
          </ul>
        )}
      </div>
    </main>
  );
}

export function ListingPage({ kind, params }: { kind: Kind; params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7faf8] px-5 py-10"><div className="mx-auto h-72 max-w-6xl animate-pulse rounded-3xl bg-white" /></main>}>
      <Inner kind={kind} params={params} />
    </Suspense>
  );
}
