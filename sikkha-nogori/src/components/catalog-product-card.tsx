import Image from "next/image";
import Link from "next/link";
import { formatBDT } from "@/lib/money";
import type { CatalogProduct, PublishedProductType } from "@/lib/catalog";
import { WishlistButton } from "@/components/wishlist-button";
import { AddToCartButton } from "@/components/add-to-cart-button";

export function CatalogProductCard({
  product,
  productType,
}: {
  product: CatalogProduct;
  productType?: PublishedProductType;
}) {
  const discountPercent =
    product.price !== null &&
    product.list_price !== null &&
    product.list_price > product.price
      ? Math.round(((product.list_price - product.price) / product.list_price) * 100)
      : null;
  const isAffiliate = product.commerce_mode === "affiliate";
  const isDirect = product.commerce_mode === "direct";

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">
      <Link
        href={`/products/${product.slug}`}
        aria-label={`পণ্যের বিস্তারিত: ${product.title}`}
        className="relative flex min-h-56 items-center justify-center overflow-hidden bg-[#f7faf8] p-4 sm:min-h-64"
      >
        {product.slug.startsWith("demo-") && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">DEMO</span>
        )}
        {discountPercent !== null && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-extrabold text-white">-{discountPercent}%</span>
        )}
        {product.image_url ? (
          <Image src={product.image_url} alt={`${product.title} প্রচ্ছদ`} width={240} height={320} unoptimized className="aspect-[3/4] max-h-56 w-auto max-w-full rounded-md object-contain transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <span role="img" aria-label="প্রচ্ছদের ছবি নেই" className="flex aspect-[3/4] w-36 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-center text-sm text-slate-500">প্রচ্ছদের ছবি নেই</span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          {isAffiliate && <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">রকমারি / পার্টনার</span>}
          {isDirect && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">শিক্ষা নগরীর স্টক</span>}
          {productType && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{productType.label}</span>}
          {product.category && <span className="max-w-full truncate text-slate-500">{product.category}</span>}
        </div>

        <Link href={`/products/${product.slug}`} className="min-w-0">
          <h2 className="mt-2 line-clamp-2 min-h-12 break-words text-[15px] font-extrabold leading-6 text-slate-900 transition group-hover:text-emerald-800 sm:text-base">{product.title}</h2>
        </Link>
        {(product.author || product.publisher) && (
          <p className="mt-1 line-clamp-1 break-words text-xs text-slate-500">
            {[product.author && `লেখক: ${product.author}`, product.publisher && `প্রকাশনী: ${product.publisher}`].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-2 line-clamp-2 flex-1 break-words text-sm leading-6 text-slate-600">{product.description}</p>

        <div className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          {isDirect && product.price !== null ? (
            <>
              <span className="font-extrabold text-emerald-800">{formatBDT(product.price)}</span>
              {product.list_price !== null && product.list_price > product.price && <span className="text-xs text-slate-400 line-through">{formatBDT(product.list_price)}</span>}
            </>
          ) : (
            <span className="text-xs font-semibold text-slate-600">পার্টনার সাইটে মূল্য যাচাই করুন</span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          {isDirect && product.price !== null ? (
            <>
              <AddToCartButton productId={product.id} />
              <Link href={`/checkout?product=${encodeURIComponent(product.id)}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">এখনই কিনুন</Link>
            </>
          ) : (
            <Link href={`/products/${product.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-700 px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">রকমারিতে কিনুন</Link>
          )}
          <div className="[&>div>button]:min-h-10 [&>div>button]:w-full [&>div>button]:rounded-lg [&>div>button]:border-slate-200 [&>div>button]:text-slate-700">
            <WishlistButton slug={product.slug} />
          </div>
        </div>
      </div>
    </article>
  );
}
