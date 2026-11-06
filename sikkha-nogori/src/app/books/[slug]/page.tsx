import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import BookCover from "@/components/book-cover";
import BookTabs, { type BookSpecRow } from "@/components/book-tabs";
import { WishlistButton } from "@/components/wishlist-button";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ShareButton } from "@/components/share-button";
import { RatingStars } from "@/components/rating-stars";
import BookFeedback from "@/components/book-feedback";
import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import { getActiveAffiliateLinks } from "@/lib/supabase/affiliate-links";
import { getBookBySlug, formatPrice, getSavings } from "@/lib/books";
import { estimateDeliveryDate, formatDeliveryDate, normalizeDeliveryDays } from "@/lib/delivery-estimate.mjs";
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

const buyNowClass =
  "inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 px-3 text-base font-bold text-slate-800 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500";

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
  // Public view: capped copy count (max 50), never raw quantities.
  const inventory = book.productId
    ? await createSupabasePublicServerClient().from("public_product_stock").select("available_copies").eq("product_id", book.productId).maybeSingle()
    : { data: null, error: null };
  const { data: generalSettings } = await createSupabasePublicServerClient().from("site_settings").select("value").eq("key", "general").maybeSingle();
  const deliveryDays = normalizeDeliveryDays((generalSettings?.value as { delivery_days?: unknown } | null)?.delivery_days);
  const deliveryText = deliveryDays > 0 ? formatDeliveryDate(estimateDeliveryDate(new Date(), deliveryDays)) : null;
  const ratingSummary = book.productId
    ? await createSupabasePublicServerClient().rpc("get_product_review_summary", { p_product_id: book.productId })
    : { data: null };
  const ratingRow = Array.isArray(ratingSummary.data) ? ratingSummary.data[0] : null;
  const ratingCount = Number(ratingRow?.review_count) || 0;
  const ratingAverage = ratingCount > 0 ? Math.round((Number(ratingRow?.average_rating) || 0) * 10) / 10 : null;
  const stockQuantity: number | null = typeof inventory.data?.available_copies === "number" ? inventory.data.available_copies : null;
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

        <article className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
          <div className="grid grid-cols-[38%_minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(14rem,0.55fr)_minmax(0,1fr)] sm:gap-8">
            <section aria-label="বইয়ের প্রচ্ছদ" className="min-w-0">
              <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg bg-slate-50 p-1.5 ring-1 ring-slate-100">
                {book.imageUrl ? (
                  <Image src={book.imageUrl} alt={`${book.title} বইয়ের প্রচ্ছদ`} width={360} height={500} unoptimized className="h-full w-full object-contain" />
                ) : book.productId ? (
                  <p role="img" aria-label={`${book.title} বইয়ের ছবি নেই`} className="px-2 text-center text-xs text-slate-500">প্রচ্ছদের ছবি নেই</p>
                ) : (
                  <BookCover book={book} className="w-full" />
                )}
              </div>
            </section>

            <section className="min-w-0">
              <h1 className="text-lg font-extrabold leading-snug text-slate-950 sm:text-3xl">{book.title}</h1>
              {book.edition && <p className="mt-1 text-sm text-slate-500">{book.edition}</p>}
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                {book.author && <p>লেখক: <span className="font-semibold text-blue-700">{book.author}</span></p>}
                {book.publisher && <p>প্রকাশনী: <span className="font-medium text-slate-800">{book.publisher}</span></p>}
                {book.category && <p>বিভাগ: <span className="font-semibold text-blue-700">{book.category}</span></p>}
              </div>
              <RatingStars rating={ratingAverage} count={ratingCount} />

              <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2.5">
                {book.price !== null ? (
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{formatPrice(book.price)}</span>
                    {savings && book.listPrice && <span className="text-sm font-semibold text-slate-500 line-through sm:text-base">{formatPrice(book.listPrice)}</span>}
                  </div>
                ) : <p className="text-sm text-slate-500">মূল্য জানতে বিক্রেতার সঙ্গে যোগাযোগ করুন</p>}
              </div>
              {savings && <p className="mt-2 text-sm font-semibold text-emerald-700">আপনি সাশ্রয় করছেন {formatPrice(savings.amount)} ({savings.percent}%)</p>}
              <p className="mt-2 text-xs leading-5 text-slate-500">মূল্য ও প্রাপ্যতা অর্ডার নিশ্চিত করার সময় যাচাই করুন।</p>
            </section>
          </div>

          {isDirectProduct && deliveryText && stockQuantity !== 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0 text-blue-700" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></svg>
              <div>
                <p className="text-sm font-bold text-blue-700">সম্ভাব্য ডেলিভারি</p>
                <p className="mt-0.5 text-sm text-slate-700">{deliveryText}ের মধ্যে পৌঁছাবে</p>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 items-stretch">
            <a href="#book-feedback" className="flex min-h-12 flex-col items-center justify-center gap-0.5 px-2 text-sm font-medium text-slate-700 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
              <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" strokeLinecap="round" /></svg>
              রিভিউ
            </a>
            <WishlistButton slug={book.slug} variant="icon" />
            <ShareButton title={book.title} />
          </div>

          {book.commerceMode === "direct" && typeof stockQuantity === "number" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {stockQuantity > 0 ? (
                <>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">স্টকে আছে</span>
                  <span className="text-sm text-slate-600">({stockQuantity >= 50 ? "৫০+" : stockQuantity.toLocaleString("bn-BD")} কপি আছে)</span>
                </>
              ) : (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-semibold text-rose-700">স্টক শেষ</span>
              )}
            </div>
          )}

          {isDirectProduct && book.productId ? (
            <section aria-label="কেনার অপশন" className="mt-4 hidden sm:block">
              <div className="grid grid-cols-2 gap-3">
                <Link href={`/checkout?product=${encodeURIComponent(book.productId)}`} className={buyNowClass}>এখনই কিনুন</Link>
                <AddToCartButton productId={book.productId} variant="bar" />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">এটি শিক্ষা নগরীর নিজস্ব বিক্রির পণ্য; অর্ডার ও ডেলিভারি checkout-এ সম্পন্ন হবে।</p>
            </section>
          ) : book.commerceMode === "affiliate" && affiliateLinksUnavailable ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950">পার্টনার লিংক এখনো ডেটাবেসে চালু হয়নি।</p>
          ) : book.commerceMode === "affiliate" && availableAffiliateLinks.length > 0 ? (
            <section aria-label="কেনার অপশন" className="mt-4 space-y-2">
              {availableAffiliateLinks.map((affiliateLink) => <a key={affiliateLink.id} href={affiliateLink.url} target="_blank" rel="sponsored nofollow noopener noreferrer" className={`${buyButtonClass} w-full`}><CartIcon />{partnerBuyLabel(affiliateLink.partner)}</a>)}
              <p className="text-xs leading-5 text-slate-500">এই বাটন affiliate link; মূল্য বিক্রেতার সাইটে যাচাই করুন। <Link href="/affiliate-disclosure" className="font-semibold text-emerald-800 underline">বিস্তারিত</Link></p>
            </section>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">{book.productId ? "এই পণ্যের জন্য বর্তমানে কোনো যাচাইকৃত কেনার লিংক নেই।" : "এটি নমুনা বই; বর্তমানে সরাসরি অর্ডার করা যাচ্ছে না।"}</p>
          )}

          {!book.productId && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">প্রদর্শিত বইয়ের বিবরণ নমুনা কনটেন্ট।</p>}
        </article>

        <section id="book-information" className="mt-6">
          <div className="mb-3">
            <h2 className="text-xl font-extrabold text-slate-950">বই সম্পর্কে বিস্তারিত</h2>
            <p className="mt-1 text-sm text-slate-500">বইয়ের সারসংক্ষেপ, প্রকাশনা ও অন্যান্য তথ্য</p>
          </div>
          <BookTabs summary={book.description ?? ""} specs={specRows} author={book.author} />
        </section>

        {book.productId && <BookFeedback productId={book.productId} />}

        <Link href="/books" className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">
          <span aria-hidden="true">←</span> বইয়ের সংগ্রহে ফিরুন
        </Link>

        {((isDirectProduct && stockQuantity !== 0) || primaryAffiliateLink) && (
          <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-2.5 shadow-[0_-6px_20px_rgba(15,23,42,0.12)] sm:hidden">
            {isDirectProduct && book.productId ? (
              <div className="grid grid-cols-2 gap-2.5">
                <Link href={`/checkout?product=${encodeURIComponent(book.productId)}`} className={buyNowClass}>
                  এখনই কিনুন
                </Link>
                <AddToCartButton productId={book.productId} variant="bar" />
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
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 pb-44 text-slate-900 sm:px-6 sm:py-12 sm:pb-12 lg:px-8">
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
