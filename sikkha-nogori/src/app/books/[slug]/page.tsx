import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import BookCover from "@/components/book-cover";
import { WishlistButton } from "@/components/wishlist-button";
import { getActiveAffiliateLinks } from "@/lib/supabase/affiliate-links";
import { getBookBySlug, formatPrice } from "@/lib/books";
import {
  getPublishedBookBySlug,
  toCatalogBook,
} from "@/lib/catalog";

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

  const affiliateLinks =
    book.commerceMode === "affiliate"
      ? await getActiveAffiliateLinks(book.slug)
      : [];
  const affiliateLinksUnavailable = affiliateLinks === null;
  const availableAffiliateLinks = affiliateLinks ?? [];
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

        <article className="mt-6 grid gap-8 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:gap-10 sm:p-8 md:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.2fr)] md:p-10">
          <div className="flex min-h-72 items-center justify-center rounded-2xl bg-emerald-50 p-8 sm:min-h-96">
            {book.imageUrl ? (
              <Image
                src={book.imageUrl}
                alt={`${book.title} বইয়ের প্রচ্ছদ`}
                width={320}
                height={440}
                unoptimized
                className="max-h-[28rem] w-auto max-w-full object-contain"
              />
            ) : book.productId ? (
              <p
                role="img"
                aria-label={`${book.title} বইয়ের ছবি নেই`}
                className="flex aspect-[3/4] w-40 items-center justify-center rounded-xl bg-white px-4 text-center text-slate-500 sm:w-56"
              >
                প্রচ্ছদের ছবি যোগ করা হয়নি
              </p>
            ) : (
              <BookCover book={book} className="w-40 sm:w-56" />
            )}
          </div>

          <div className="flex flex-col justify-center">
            {book.category && (
              <Link
                href={`/books?category=${encodeURIComponent(book.category)}`}
                className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
              >
                {book.category}
              </Link>
            )}
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
              {book.title}
            </h1>
            {book.author && (
              <p className="mt-3 text-base text-slate-600">
                লেখক/ব্র্যান্ড:{" "}
                <span className="font-semibold text-slate-800">
                  {book.author}
                </span>
              </p>
            )}
            {book.publisher && (
              <p className="mt-2 text-sm text-slate-600">
                প্রকাশক:{" "}
                <span className="font-semibold text-slate-800">
                  {book.publisher}
                </span>
              </p>
            )}

            {book.commerceMode === "direct" && book.productId ? (
              <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
                {book.price !== null && (
                  <p className="text-xl font-extrabold text-emerald-950">
                    {formatPrice(book.price)}
                  </p>
                )}
                <p className="mt-1 text-sm leading-6 text-emerald-900">
                  এটি শিক্ষা নগরীর নিজস্ব বিক্রির পণ্য; অর্ডার ও fulfillment
                  সাইটের checkout-এ হবে।
                </p>
                <Link
                  href={`/checkout?product=${encodeURIComponent(book.productId)}`}
                  className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  অর্ডার করতে checkout-এ যান
                </Link>
              </section>
            ) : book.commerceMode === "affiliate" &&
              affiliateLinksUnavailable ? (
              <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                পার্টনার লিংক এখনো ডেটাবেসে চালু হয়নি।
              </p>
            ) : book.commerceMode === "affiliate" &&
              availableAffiliateLinks.length > 0 ? (
              <section
                aria-labelledby="affiliate-links-heading"
                className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5"
              >
                <h2
                  id="affiliate-links-heading"
                  className="text-lg font-bold text-emerald-950"
                >
                  পণ্যটি পার্টনারের কাছে দেখুন
                </h2>
                <p className="mt-1 text-sm leading-6 text-emerald-900">
                  এই affiliate link থেকে শিক্ষা নগরী কমিশন পেতে পারে। বিক্রেতার
                  সাইটে পণ্যের বর্তমান মূল্য, মজুত ও শর্ত যাচাই করুন।
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {availableAffiliateLinks.map((affiliateLink) => {
                    const partnerName =
                      affiliateLink.partner === "rokomari"
                        ? "Rokomari"
                        : affiliateLink.partner === "10_minute_school"
                          ? "10 Minute School"
                          : "পার্টনার";

                    return (
                      <a
                        key={affiliateLink.id}
                        href={affiliateLink.url}
                        target="_blank"
                        rel="sponsored nofollow noopener noreferrer"
                        className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      >
                        {partnerName}-এ দেখুন
                      </a>
                    );
                  })}
                </div>
                <Link
                  href="/affiliate-disclosure"
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-emerald-900 underline underline-offset-2"
                >
                  অ্যাফিলিয়েট লিংক সম্পর্কে
                </Link>
              </section>
            ) : book.commerceMode === "affiliate" ? (
              <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
                এই পণ্যের জন্য বর্তমানে কোনো যাচাইকৃত কেনার লিংক নেই।
              </p>
            ) : (
              <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
                এই নমুনা বইয়ের জন্য বর্তমানে কোনো যাচাইকৃত কেনার লিংক নেই।
              </p>
            )}

            <div className="mt-5 max-w-xs">
              <WishlistButton slug={book.slug} />
            </div>
            <div className="mt-7 border-t border-slate-100 pt-6">
              <h2 className="text-lg font-bold">বই সম্পর্কে</h2>
              <p className="mt-3 leading-7 text-slate-600">{book.description}</p>
            </div>

            {!book.productId && (
              <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                প্রদর্শিত বইয়ের বিবরণ নমুনা কনটেন্ট।
              </p>
            )}

            <Link
              href="/books"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
            >
              <span aria-hidden="true">←</span> বইয়ের সংগ্রহে ফিরুন
            </Link>
          </div>
        </article>
    </div>
  );
}

export default function BookDetailsPage({
  params,
}: PageProps<"/books/[slug]">) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
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
