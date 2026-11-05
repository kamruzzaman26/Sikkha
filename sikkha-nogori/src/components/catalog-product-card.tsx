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

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">
      <Link
        href={`/products/${product.slug}`}
        aria-label={`পণ্যের বিস্তারিত: ${product.title}`}
        className="relative flex min-h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 to-slate-50 p-5"
      >
        {product.slug.startsWith("demo-") && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">
            DEMO
          </span>
        )}
        {discountPercent !== null && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-extrabold text-white">
            -{discountPercent}%
          </span>
        )}
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={`${product.title} পণ্যের ছবি`}
            width={240}
            height={320}
            unoptimized
            className="aspect-[3/4] max-h-56 w-auto max-w-full rounded-lg object-contain"
          />
        ) : (
          <span
            role="img"
            aria-label={`${product.title} পণ্যের ছবি নেই`}
            className="flex aspect-[3/4] w-36 items-center justify-center rounded-lg border border-emerald-100 bg-white px-3 text-center text-sm font-semibold text-slate-500"
          >
            ছবি নেই
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 pt-4 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {productType && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
              {productType.label}
            </span>
          )}
          {product.category && (
            <span className="text-slate-500">{product.category}</span>
          )}
        </div>
        <Link href={`/products/${product.slug}`} className="group/title">
          <h2 className="mt-2 line-clamp-2 min-h-12 font-bold leading-6 text-slate-900 group-hover/title:text-emerald-800">
            {product.title}
          </h2>
        </Link>
        {(product.author || product.publisher) && (
          <p className="mt-1 text-sm text-slate-500">
            {[product.author, product.publisher].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
          {product.description}
        </p>
        {product.commerce_mode === "direct" && product.price !== null ? (
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <p className="font-extrabold text-emerald-800">
              {formatBDT(product.price)}
            </p>
            {product.list_price !== null && product.list_price > product.price && (
              <p className="text-xs text-slate-400 line-through">
                {formatBDT(product.list_price)}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm font-semibold text-slate-600">
            বাইরের বিক্রেতার কাছে উপলভ্য
          </p>
        )}
        <Link
          href={`/products/${product.slug}`}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 px-3 py-2.5 text-center text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          বিস্তারিত দেখুন
        </Link>
        {product.commerce_mode === "direct" && product.price !== null && (
          <>
            <Link
              href={`/checkout?product=${encodeURIComponent(product.id)}`}
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              অর্ডার করুন
            </Link>
            <AddToCartButton productId={product.id} />
          </>
        )}
        <div className="mt-2">
          <WishlistButton slug={product.slug} />
        </div>
      </div>
    </article>
  );
}
