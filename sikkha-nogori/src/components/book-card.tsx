import Image from "next/image";
import Link from "next/link";
import { formatPrice, getSavings, type Book } from "@/lib/books";
import type { PublicAffiliateLink } from "@/lib/supabase/affiliate-links";
import BookCover from "@/components/book-cover";
import { WishlistButton } from "@/components/wishlist-button";
import { AddToCartButton } from "@/components/add-to-cart-button";

function partnerLabel(partner: string | null): string {
  if (partner === "rokomari") return "রকমারিতে কিনুন";
  if (partner === "10_minute_school") return "10 Minute School-এ কিনুন";
  return "পার্টনারের সাইটে কিনুন";
}

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
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
      <Link
        href={`/books/${book.slug}`}
        aria-label={`বইয়ের বিস্তারিত: ${book.title}`}
        className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-slate-100 p-2.5 sm:p-3"
      >
        {savings && (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-rose-500 px-2 py-1 text-[11px] font-extrabold text-white shadow-sm">
            -{savings.percent}%
          </span>
        )}
        <span
          className={`absolute right-2 top-2 z-10 rounded-full border px-2 py-1 text-[10px] font-bold ${
            buyLink
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : isDirect
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white/95 text-slate-500"
          }`}
        >
          {buyLink ? "পার্টনার" : isDirect ? "শিক্ষা নগরী" : book.productId ? "ক্যাটালগ" : "নমুনা"}
        </span>
        {book.imageUrl ? (
          <Image
            src={book.imageUrl}
            alt={`${book.title} বইয়ের প্রচ্ছদ`}
            width={240}
            height={320}
            unoptimized
            className="h-full w-full max-h-full max-w-full rounded object-contain drop-shadow-md transition duration-300 group-hover:scale-[1.04]"
          />
        ) : book.productId ? (
          <span
            role="img"
            aria-label={`${book.title} বইয়ের ছবি নেই`}
            className="flex aspect-[3/4] max-h-full w-32 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-center text-sm font-semibold text-slate-400"
          >
            প্রচ্ছদের ছবি নেই
          </span>
        ) : (
          <BookCover book={book} className="max-h-52 transition group-hover:rotate-1" />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {book.category && (
          <p className="mb-1.5 line-clamp-1 text-[11px] font-bold text-emerald-700 sm:text-xs">
            {book.category}
          </p>
        )}
        <Link href={`/books/${book.slug}`} className="group/title">
          <h3 className="line-clamp-2 min-h-11 text-sm font-bold leading-5 text-slate-900 group-hover/title:text-emerald-700 sm:min-h-12 sm:text-base sm:leading-6">
            {book.title}
          </h3>
        </Link>
        {book.author && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500 sm:text-sm">
            {book.author}
          </p>
        )}

        <div className="mt-3 min-h-[3.5rem]">
          {hasPrice ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-base font-extrabold text-slate-900 sm:text-lg">
                {formatPrice(book.price as number)}
              </p>
              {savings && book.listPrice && (
                <p className="text-xs font-medium text-slate-400 line-through">
                  {formatPrice(book.listPrice)}
                </p>
              )}
              {savings && (
                <p className="w-full text-[11px] font-semibold text-emerald-700">
                  সাশ্রয় {formatPrice(savings.amount)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">মূল্য জানতে বিস্তারিত দেখুন</p>
          )}
          {!isDirect && book.productId && hasPrice && (
            <p className="mt-0.5 text-[10px] text-slate-400">পার্টনারের প্রদর্শিত মূল্য; পরিবর্তন হতে পারে</p>
          )}
        </div>

        <div className="mt-auto space-y-2 pt-3">
          {buyLink ? (
            <a
              href={buyLink.url}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-800 transition hover:bg-emerald-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 border border-emerald-200 sm:text-sm"
            >
              {partnerLabel(buyLink.partner)}
            </a>
          ) : isDirect && book.productId ? (
            <AddToCartButton productId={book.productId} />
          ) : (
            <Link
              href={`/books/${book.slug}`}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-800 transition hover:bg-emerald-700 hover:text-white sm:text-sm border border-emerald-200"
            >
              বিস্তারিত দেখুন
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Link
              href={`/books/${book.slug}`}
              className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              বইয়ের তথ্য
            </Link>
            <div className="min-w-0 flex-1">
              <WishlistButton slug={book.slug} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
