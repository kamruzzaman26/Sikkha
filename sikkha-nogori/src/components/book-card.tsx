import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Book } from "@/lib/books";
import type { PublicAffiliateLink } from "@/lib/supabase/affiliate-links";
import BookCover from "@/components/book-cover";
import { WishlistButton } from "@/components/wishlist-button";

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

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
      <Link
        href={`/books/${book.slug}`}
        aria-label={`বইয়ের বিস্তারিত: ${book.title}`}
        className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 p-5"
      >
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-sm">
          {book.productId ? "ক্যাটালগ" : "নমুনা"}
        </span>
        {book.imageUrl ? (
          <Image
            src={book.imageUrl}
            alt={`${book.title} বইয়ের প্রচ্ছদ`}
            width={240}
            height={320}
            unoptimized
            className="aspect-[3/4] w-36 rounded-lg object-contain transition group-hover:scale-[1.02] sm:w-44"
          />
        ) : book.productId ? (
          <span
            role="img"
            aria-label={`${book.title} বইয়ের ছবি নেই`}
            className="flex aspect-[3/4] w-36 items-center justify-center rounded-lg border border-emerald-100 bg-white px-3 text-center text-sm font-semibold text-slate-500 sm:w-44"
          >
            ছবি নেই
          </span>
        ) : (
          <BookCover book={book} className="transition group-hover:rotate-1" />
        )}
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <p className="text-xs font-semibold text-emerald-700">{book.category}</p>
        <Link href={`/books/${book.slug}`} className="group/title">
          <h3 className="mt-2 line-clamp-2 min-h-12 font-bold leading-6 text-slate-900 group-hover/title:text-emerald-800">
            {book.title}
          </h3>
        </Link>
        {book.author && (
          <p className="mt-1 text-sm text-slate-500">
            লেখক/ব্র্যান্ড: {book.author}
          </p>
        )}

        <div className="mt-3 min-h-12">
          {hasPrice ? (
            <>
              <p className="text-lg font-extrabold text-emerald-900">
                {formatPrice(book.price as number)}
              </p>
              {!isDirect && book.productId && (
                <p className="text-xs text-slate-500">
                  রকমারি মূল্য · Price may change
                </p>
              )}
            </>
          ) : (
            book.productId &&
            !isDirect && (
              <p className="text-sm text-slate-500">
                মূল্য সাইটে দেখুন · Check price
              </p>
            )
          )}
        </div>
        {buyLink ? (
          <a
            href={buyLink.url}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
              <path d="M2 3h3l2.7 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6" />
            </svg>
            {partnerLabel(buyLink.partner)}
          </a>
        ) : isDirect ? (
          <Link
            href={`/checkout?product=${encodeURIComponent(book.productId as string)}`}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-700 px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            অর্ডার করুন
          </Link>
        ) : null}
        <Link
          href={`/books/${book.slug}`}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-700 px-3 py-2.5 text-center text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          বিস্তারিত দেখুন
        </Link>
        <div className="mt-2">
          <WishlistButton slug={book.slug} />
        </div>
      </div>
    </article>
  );
}
