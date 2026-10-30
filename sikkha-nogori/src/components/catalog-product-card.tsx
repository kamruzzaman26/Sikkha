import Image from "next/image";
import Link from "next/link";
import { formatBDT } from "@/lib/money";
import type { CatalogProduct, PublishedProductType } from "@/lib/catalog";
import { WishlistButton } from "@/components/wishlist-button";

export function CatalogProductCard({
  product,
  productType,
}: {
  product: CatalogProduct;
  productType?: PublishedProductType;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        aria-label={`পণ্যের বিস্তারিত: ${product.title}`}
        className="flex min-h-52 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 p-5"
      >
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

      <div className="flex flex-1 flex-col pt-4">
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
          <p className="mt-4 font-extrabold text-emerald-800">
            {formatBDT(product.price)}
          </p>
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
        <div className="mt-2">
          <WishlistButton slug={product.slug} />
        </div>
      </div>
    </article>
  );
}
