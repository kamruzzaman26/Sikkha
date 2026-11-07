import Image from "next/image";
import Link from "next/link";
import { formatPrice, getSavings, type Book } from "@/lib/books";
import type { PublicAffiliateLink } from "@/lib/supabase/affiliate-links";
import BookCover from "@/components/book-cover";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { RatingStars } from "@/components/rating-stars";
import { StockLabel } from "@/components/stock-label";

function partnerLabel(partner: string | null): string {
  if (partner === "rokomari") return "রকমারিতে কিনুন";
  if (partner === "10_minute_school") return "10 Minute School-এ কিনুন";
  return "পার্টনারের সাইটে কিনুন";
}

const ctaClass =
  "inline-flex min-h-10 w-full items-center justify-center rounded-full bg-sky-50 px-3 py-2 text-center text-sm font-bold text-blue-700 transition hover:bg-blue-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

/** Compact catalog card: cover, title, author, rating, stock, price + discount, one CTA. */
export default function BookCard({
  book,
  buyLink,
}: {
  book: Book;
  buyLink?: PublicAffiliateLink | null;
}) {
  const hasPrice = book.price !== null && book.price !== undefined;
  const isDirect = book.commerceMode === "direct" && Boolean(book.productId);
  const savings = getSavings(book.price, book.listPrice);

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition duration-200 hover:border-emerald-200 hover:shadow-md">
      <Link
        href={`/books/${book.slug}`}
        aria-label={`Book details: ${book.title}`}
        className="relative flex h-32 items-center justify-center overflow-hidden bg-slate-50 p-1.5 sm:h-48"
      >
        <span
          className={`absolute right-1.5 top-1.5 z-10 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
            buyLink
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : isDirect
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white/95 text-slate-500"
          }`}
        >
          {buyLink ? "Partner" : isDirect ? "Sikkha Nogori" : book.productId ? "Catalog" : "Sample"}
        </span>
        {book.imageUrl ? (
          <Image
            src={book.imageUrl}
            alt={`${book.title} book cover`}
            width={240}
            height={320}
            unoptimized
            className="h-full w-full max-h-full max-w-full object-contain transition duration-300 group-hover:scale-[1.03]"
          />
        ) : book.productId ? (
          <span
            role="img"
            aria-label={`${book.title} has no cover image`}
            className="flex h-full max-h-full w-24 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-center text-sm font-semibold text-slate-400"
          >
            No cover
          </span>
        ) : (
          <BookCover book={book} className="max-h-32 sm:max-h-44" />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <Link href={`/books/${book.slug}`} className="group/title">
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900 group-hover/title:text-emerald-700 sm:text-[15px]">
            {book.title}
          </h3>
        </Link>
        {book.author && (
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{book.author}</p>
        )}
        <RatingStars rating={book.rating} count={book.ratingCount} />
        {isDirect && <StockLabel inStock={book.inStock} />}

        <div className="mt-1.5 min-h-7">
          {hasPrice ? (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <p className="text-base font-extrabold text-slate-900">{formatPrice(book.price as number)}</p>
              {savings && book.listPrice && (
                <p className="text-xs font-medium text-slate-400 line-through">{formatPrice(book.listPrice)}</p>
              )}
              {savings && (
                <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">-{savings.percent}%</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">See details for price</p>
          )}
          {!isDirect && book.productId && hasPrice && (
            <p className="mt-0.5 text-[10px] text-slate-400">Partner-listed price; may change</p>
          )}
        </div>

        <div className="mt-auto pt-2.5">
          {buyLink ? (
            <a
              href={buyLink.url}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className={ctaClass}
            >
              {partnerLabel(buyLink.partner)}
            </a>
          ) : isDirect && book.productId ? (
            <AddToCartButton productId={book.productId} />
          ) : (
            <Link href={`/books/${book.slug}`} className={ctaClass}>
              View Details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
