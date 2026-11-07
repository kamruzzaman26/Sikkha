import Image from "next/image";
import Link from "next/link";
import { formatBDT } from "@/lib/money";
import type { CatalogProduct, PublishedProductType } from "@/lib/catalog";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { RatingStars } from "@/components/rating-stars";
import { StockLabel } from "@/components/stock-label";

/** Compact catalog card: cover, title, brand/author, rating, stock, price + discount, one CTA. */
export function CatalogProductCard({
  product,
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
  const isDirect = product.commerce_mode === "direct";
  const byline = product.author || product.publisher;

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition duration-200 hover:border-emerald-200 hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        aria-label={`Product details: ${product.title}`}
        className="relative flex h-32 items-center justify-center overflow-hidden bg-slate-50 p-1.5 sm:h-48"
      >
        {product.slug.startsWith("demo-") && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
            DEMO
          </span>
        )}
        <span
          className={`absolute right-1.5 top-1.5 z-10 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
            isDirect
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {isDirect ? "Sikkha Nogori" : "Partner"}
        </span>
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={`${product.title} product image`}
            width={240}
            height={320}
            unoptimized
            className="h-full w-full max-h-full max-w-full object-contain transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span
            role="img"
            aria-label={`${product.title} has no image`}
            className="flex h-full w-24 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-slate-400"
          >
            No image
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <Link href={`/products/${product.slug}`} className="group/title">
          <h3 className="line-clamp-2 min-h-10 break-words text-sm font-bold leading-5 text-slate-900 group-hover/title:text-emerald-700 sm:text-[15px]">
            {product.title}
          </h3>
        </Link>
        {byline && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{byline}</p>}
        <RatingStars rating={product.rating_average} count={product.rating_count} />
        {isDirect && <StockLabel inStock={product.in_stock} />}

        <div className="mt-1.5 min-h-7">
          {isDirect && product.price !== null ? (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <p className="text-base font-extrabold text-slate-900">{formatBDT(product.price)}</p>
              {discountPercent !== null && product.list_price !== null && (
                <p className="text-xs font-medium text-slate-400 line-through">{formatBDT(product.list_price)}</p>
              )}
              {discountPercent !== null && (
                <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">-{discountPercent}%</span>
              )}
            </div>
          ) : (
            <p className="text-xs font-semibold text-slate-500">Available from partner store</p>
          )}
        </div>

        <div className="mt-auto pt-2.5">
          {isDirect && product.price !== null ? (
            <AddToCartButton productId={product.id} />
          ) : (
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-sky-50 px-3 py-2 text-center text-sm font-bold text-blue-700 transition hover:bg-blue-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              View Details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
