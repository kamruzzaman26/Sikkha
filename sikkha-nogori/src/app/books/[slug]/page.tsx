import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import BookCover from "@/components/book-cover";
import BookTabs, { type BookSpecRow } from "@/components/book-tabs";
import { WishlistButton } from "@/components/wishlist-button";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { getActiveAffiliateLinks } from "@/lib/supabase/affiliate-links";
import { getBookBySlug, formatPrice, getSavings } from "@/lib/books";
import {
  getPublishedBookBySlug,
  toCatalogBook,
} from "@/lib/catalog";

function partnerBuyLabel(partner: string | null): string {
  if (partner === "rokomari") return "রকমারিতে কিনুন";
  if (partner === "10_minute_school") return "10 Minute School-এ কিনুন";
  return "পার্টনারের সাইটে কিনুন";
}

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
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
  );
}

const buyButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-base font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

export async function generateMetadata({
  params,
}: Pick<PageProps<"/books/[slug]">, "params">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedBookBySlug(slug);
  const book = product ? toCatalogBook(product) : getBookBySlug(slug);

  if (!book) {
    return {
      title: "বই পাওয়া যায়নি | শিক্ষা নগরী",
      robots: { index: false, follow: false },
    };
  }

  const title = `${book.title} | শিক্ষা নগরী`;
  const description = (
    book.description?.trim() ||
    `${book.title}${book.author ? ` — ${book.author}` : ""}`
  ).slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "book",
      ...(book.imageUrl ? { images: [book.imageUrl] } : {}),
    },
  };
}

async function BookDetails({
  params,
}: Pick<PageProps<"/books/[slug]">, "params">) {
  const { slug } = await params;
  const catalogProduct = await getPublishedBookBySlug(slug);
  const book = catalogProduct
    ? toCatalogBook(catalogProduct)
    : getBookBySlug(slug);

  if (!book) {
    notFound();
  }

  const savings = getSavings(book.price, book.listPrice);
  const specRows: BookSpecRow[] = [
    { label: "Name", value: book.title },
    { label: "Category", value: book.category },
    { label: "Author", value: book.author },
    { label: "Edition", value: book.edition ?? "" },
    { label: "ISBN", value: book.isbn ?? "" },
    {
      label: "No of Page",
      value: book.pageCount ? String(book.pageCount) : "",
    },
    { label: "Language", value: book.language ?? "" },
    { label: "Publisher", value: book.publisher },
    { label: "Country", value: book.country ?? "" },
    {
      label: "Weight",
      value: book.weightKg ? `${book.weightKg} Kg` : "",
    },
  ].filter((row) => row.value.trim() !== "");

  const affiliateLinks =
    book.commerceMode === "affiliate"
      ? await getActiveAffiliateLinks(book.slug)
      : [];
  const affiliateLinksUnavailable = affiliateLinks === null;
  const availableAffiliateLinks = affiliateLinks ?? [];
  const primaryAffiliateLink = availableAffiliateLinks[0] ?? null;
  const isDirectProduct = book.commerceMode === "direct" && Boolean(book.productId);
  return (
    <div className="mx-auto max-w-6xl">
        <nav aria-label="breadcrumb" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <Link
            href="/books"
            className="font-semibold text-emerald-800 hover:underline"
          >
            সব বই
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <span>{book.title}</span>
        </nav>

        <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(17rem,0.82fr)_minmax(0,1.18fr)]">
            <section className="flex flex-col items-center border-b border-slate-100 bg-[#f8faf9] px-5 py-7 md:border-b-0 md:border-r md:px-8 md:py-9">
              <span className="mb-3 text-xs font-bold tracking-wide text-emerald-800">বইয়ের প্রচ্ছদ</span>
              <div className="flex min-h-[20rem] w-full max-w-[19rem] items-center justify-center rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 sm:min-h-[26rem]">
                {book.imageUrl ? (
                  <Image src={book.imageUrl} alt={`${book.title} বইয়ের প্রচ্ছদ`} width={360} height={500} unoptimized className="max-h-[25rem] w-auto max-w-full object-contain drop-shadow-lg" />
                ) : book.productId ? (
                  <p role="img" aria-label={`${book.title} বইয়ের ছবি নেই`} className="flex aspect-[3/4] w-44 items-center justify-center rounded-lg bg-slate-50 px-4 text-center text-sm text-slate-500">প্রচ্ছদের ছবি যোগ করা হয়নি</p>
                ) : (
                  <BookCover book={book} className="w-48 sm:w-56" />
                )}
              </div>
              <p className="mt-4 text-center text-xs text-slate-500">প্রচ্ছদের ছবি ও সংস্করণ প্রকাশকের তথ্য অনুযায়ী</p>
            </section>

            <section className="flex flex-col p-5 sm:p-7 lg:p-9">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">{book.category}</span>
                {book.edition && <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{book.edition}</span>}
              </div>
              <h1 className="mt-3 text-2xl font-extrabold leading-snug text-slate-950 sm:text-3xl">{book.title}</h1>
              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                {book.author && <p>লেখক: <span className="font-bold text-emerald-800">{book.author}</span></p>}
                {book.publisher && <p>প্রকাশনী: <span className="font-semibold text-slate-800">{book.publisher}</span></p>}
              </div>

              <div className="my-5 border-y border-slate-100 py-5">
                {book.price !== null ? (
                  <>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{formatPrice(book.price)}</span>
                      {savings && book.listPrice && <span className="text-base text-slate-400 line-through">{formatPrice(book.listPrice)}</span>}
                      {savings && <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-extrabold text-rose-700">-{savings.percent}%</span>}
                    </div>
                    {savings && <p className="mt-2 text-sm font-semibold text-emerald-700">আপনি সাশ্রয় করছেন {formatPrice(savings.amount)} ({savings.percent}%)</p>}
                  </>
                ) : <p className="text-sm text-slate-500">মূল্য জানতে বিক্রেতার সঙ্গে যোগাযোগ করুন</p>}
                <p className="mt-3 text-xs leading-5 text-slate-500">মূল্য ও প্রাপ্যতা অর্ডার নিশ্চিত করার সময় যাচাই করুন।</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href="#book-information" className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50">বিস্তারিত তথ্য</Link>
                <div className="min-w-36"><WishlistButton slug={book.slug} /></div>
              </div>

              {isDirectProduct && book.productId ? (
                <section aria-label="কেনার অপশন" className="mt-5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Link href={`/checkout?product=${encodeURIComponent(book.productId)}`} className={`${buyButtonClass} w-full`}>এখনই কিনুন</Link>
                    <div className="[&>div>button]:min-h-12 [&>div>button]:w-full [&>div>button]:rounded-lg [&>div>button]:bg-emerald-50 [&>div>button]:text-emerald-800 [&>div>button]:border [&>div>button]:border-emerald-200 [&>div>button]:hover:bg-emerald-100"><AddToCartButton productId={book.productId} /></div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">এটি শিক্ষা নগরীর নিজস্ব বিক্রির পণ্য; অর্ডার ও ডেলিভারি checkout-এ সম্পন্ন হবে।</p>
                </section>
              ) : book.commerceMode === "affiliate" && affiliateLinksUnavailable ? (
                <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950">পার্টনার লিংক এখনো ডেটাবেসে চালু হয়নি।</p>
              ) : book.commerceMode === "affiliate" && availableAffiliateLinks.length > 0 ? (
                <section aria-label="কেনার অপশন" className="mt-5 space-y-2">
                  {availableAffiliateLinks.map((affiliateLink) => <a key={affiliateLink.id} href={affiliateLink.url} target="_blank" rel="sponsored nofollow noopener noreferrer" className={`${buyButtonClass} w-full`}><CartIcon />{partnerBuyLabel(affiliateLink.partner)}</a>)}
                  <p className="text-xs leading-5 text-slate-500">এই বাটন affiliate link; মূল্য বিক্রেতার সাইটে যাচাই করুন। <Link href="/affiliate-disclosure" className="font-semibold text-emerald-800 underline">বিস্তারিত</Link></p>
                </section>
              ) : (
                <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">{book.productId ? "এই পণ্যের জন্য বর্তমানে কোনো যাচাইকৃত কেনার লিংক নেই।" : "এটি নমুনা বই; বর্তমানে সরাসরি অর্ডার করা যাচ্ছে না।"}</p>
              )}

              {!book.productId && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">প্রদর্শিত বইয়ের বিবরণ নমুনা কনটেন্ট।</p>}
            </section>
          </div>
        </article>

        <section id="book-information" className="mt-6">
          <div className="mb-3">
            <h2 className="text-xl font-extrabold text-slate-950">বই সম্পর্কে বিস্তারিত</h2>
            <p className="mt-1 text-sm text-slate-500">বইয়ের সারসংক্ষেপ, প্রকাশনা ও অন্যান্য তথ্য</p>
          </div>
          <BookTabs summary={book.description ?? ""} specs={specRows} author={book.author} />
        </section>

        <Link href="/books" className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">
          <span aria-hidden="true">←</span> বইয়ের সংগ্রহে ফিরুন
        </Link>

        {(isDirectProduct || primaryAffiliateLink) && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-6px_20px_rgba(15,23,42,0.12)] backdrop-blur sm:hidden">
            {isDirectProduct && book.productId ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/checkout?product=${encodeURIComponent(book.productId)}`}
                  className={`${buyButtonClass} min-h-12 px-2 text-sm`}
                >
                  এখনই কিনুন
                </Link>
                <div className="[&>div>button]:min-h-12 [&>div>button]:rounded-lg [&>div>button]:bg-emerald-700 [&>div>button]:text-sm [&>div>button]:text-white [&>div>button]:hover:bg-emerald-800">
                  <AddToCartButton productId={book.productId} />
                </div>
              </div>
            ) : primaryAffiliateLink ? (
              <a
                href={primaryAffiliateLink.url}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                className={`${buyButtonClass} w-full`}
              >
                <CartIcon />
                {partnerBuyLabel(primaryAffiliateLink.partner)}
              </a>
            ) : null}
          </div>
        )}
    </div>
  );
}

export default function BookDetailsPage({
  params,
}: PageProps<"/books/[slug]">) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 pb-28 text-slate-900 sm:px-6 sm:py-12 sm:pb-12 lg:px-8">
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl animate-pulse rounded-3xl bg-white p-8">
            <div className="h-6 w-40 rounded bg-emerald-100" />
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div className="h-96 rounded-2xl bg-emerald-50" />
              <div className="h-80 rounded-2xl bg-slate-100" />
            </div>
          </div>
        }
      >
        <BookDetails params={params} />
      </Suspense>
    </main>
  );
}
