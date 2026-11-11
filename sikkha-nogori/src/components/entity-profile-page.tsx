import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CatalogProductCard } from "@/components/catalog-product-card";
import {
  catalogPageSize,
  getCatalogEntityBySlug,
  getEntityProducts,
  type CatalogEntityKind,
} from "@/lib/catalog";
import { getSiteSettings } from "@/lib/site-settings";

const labels: Record<CatalogEntityKind, { singular: string; plural: string }> = {
  authors: { singular: "লেখক", plural: "লেখক" },
  publishers: { singular: "প্রকাশক", plural: "প্রকাশক" },
  brands: { singular: "ব্র্যান্ড", plural: "ব্র্যান্ড" },
};

export async function entityMetadata(kind: CatalogEntityKind, slugPromise: Promise<{ slug: string }>): Promise<Metadata> {
  await connection();
  const { slug } = await slugPromise;
  const [entity, { general }] = await Promise.all([getCatalogEntityBySlug(kind, slug), getSiteSettings()]);
  if (!entity) return { title: "পাওয়া যায়নি", robots: { index: false, follow: false } };
  const title = `${entity.seoTitle || `${entity.name} — ${labels[kind].singular}`} | ${general.siteName}`;
  const description = (entity.seoDescription || entity.description || `${entity.name}-এর সব পণ্য ${general.siteName}-এ।`).slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/${kind}/${entity.slug}` },
    openGraph: { title, description, url: `/${kind}/${entity.slug}`, ...(entity.imageUrl ? { images: [entity.imageUrl] } : {}) },
  };
}

async function Profile({
  kind,
  params,
  searchParams,
}: {
  kind: CatalogEntityKind;
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await connection();
  const { slug } = await params;
  const query = await searchParams;
  const entity = await getCatalogEntityBySlug(kind, slug);
  if (!entity) notFound();

  const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const { products, total } = await getEntityProducts(kind, entity.id, page);
  const totalPages = Math.max(1, Math.ceil(total / catalogPageSize));
  const href = (p: number) => `/${kind}/${entity.slug}${p > 1 ? `?page=${p}` : ""}`;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-[#006b4f]">হোম</Link> / <span>{labels[kind].singular}</span> / <span className="text-slate-800">{entity.name}</span>
        </nav>
        <header className="flex flex-col gap-5 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-7">
          {entity.imageUrl ? (
            <Image src={entity.imageUrl} alt={entity.name} width={112} height={112} className="size-24 shrink-0 rounded-2xl border border-slate-100 object-cover sm:size-28" />
          ) : (
            <span aria-hidden="true" className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl font-bold text-[#006b4f] sm:size-28">{entity.name.slice(0, 1)}</span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[#006b4f]">{labels[kind].singular}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#073f33] sm:text-3xl">{entity.name}</h1>
            {entity.description && <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-600">{entity.description}</p>}
            {entity.websiteUrl && <a href={entity.websiteUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-[#006b4f] hover:underline">ওয়েবসাইট দেখুন</a>}
            <p className="mt-2 text-sm font-semibold text-slate-700">মোট {total}টি পণ্য</p>
          </div>
        </header>

        {products.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-white p-8 text-center text-slate-600">এখনও কোনো পণ্য যুক্ত করা হয়নি।</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => <li key={product.id}><CatalogProductCard product={product} /></li>)}
          </ul>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3 text-sm">
            {page > 1 && <Link href={href(page - 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold">← আগের</Link>}
            <span className="text-slate-600">{page} / {totalPages}</span>
            {page < totalPages && <Link href={href(page + 1)} className="rounded-xl bg-[#006b4f] px-4 py-2 font-semibold text-white">পরের →</Link>}
          </nav>
        )}
      </div>
    </main>
  );
}

export function EntityProfilePage({
  kind,
  params,
  searchParams,
}: {
  kind: CatalogEntityKind;
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7faf8] px-5 py-10"><div className="mx-auto h-72 max-w-6xl animate-pulse rounded-3xl bg-white" /></main>}>
      <Profile kind={kind} params={params} searchParams={searchParams} />
    </Suspense>
  );
}
