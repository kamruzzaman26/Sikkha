import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { getHomepageListings } from "@/lib/merchandising";

async function Rows() {
  await connection();
  let listings: Awaited<ReturnType<typeof getHomepageListings>> = [];
  try {
    listings = await getHomepageListings();
  } catch {
    return null; // The homepage must never fail because of an optional section.
  }
  if (listings.length === 0) return null;
  return (
    <>
      {listings.map((listing) => (
        <section key={`${listing.kind}-${listing.id}`} aria-label={listing.title} className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold text-[#073f33] sm:text-2xl">{listing.title}</h2>
              {listing.description && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 sm:text-sm">{listing.description}</p>}
            </div>
            <Link href={`${listing.kind === "collection" ? "/collections" : "/lists"}/${listing.slug}`} className="shrink-0 text-sm font-bold text-emerald-800 hover:underline">সব দেখুন ›</Link>
          </div>
          <ul className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
            {listing.products.slice(0, 10).map((product) => (
              <li key={product.id} className="w-40 shrink-0 snap-start sm:w-auto"><CatalogProductCard product={product} /></li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export function HomeMerchandising() {
  return (
    <Suspense fallback={null}>
      <Rows />
    </Suspense>
  );
}
