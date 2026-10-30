import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getActiveAffiliateLinks } from "@/lib/supabase/affiliate-links";
import { WishlistButton } from "@/components/wishlist-button";
import {
  getPublishedProductBySlug,
  getPublishedProductTypes,
} from "@/lib/catalog";
import { formatBDT } from "@/lib/money";

type ProductPageProps = Pick<PageProps<"/products/[slug]">, "params">;

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);

  if (!product) {
    return {
      title: "পণ্য পাওয়া যায়নি | শিক্ষা নগরী",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${product.title} | শিক্ষা নগরী`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: `${product.title} | শিক্ষা নগরী`,
      description: product.description.slice(0, 160),
      ...(product.image_url ? { images: [product.image_url] } : {}),
    },
  };
}

async function ProductDetails({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);

  if (product === undefined) {
    notFound();
  }
  if (product === null) {
    return (
      <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 leading-7 text-amber-950">
        পণ্য ক্যাটালগের ডেটাবেস সেটআপ এখনো প্রস্তুত নয়।
      </p>
    );
  }

  const [productTypes, affiliateLinks] = await Promise.all([
    getPublishedProductTypes(),
    product.commerce_mode === "affiliate"
      ? getActiveAffiliateLinks(product.slug)
      : Promise.resolve([]),
  ]);
  const productType = productTypes?.find(
    (type) => type.slug === product.product_type,
  );
  const activeAffiliateLinks = affiliateLinks ?? [];

  return (
    <article className="mt-7 grid gap-8 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:gap-10 sm:p-8 md:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.2fr)] md:p-10">
      <div className="flex min-h-72 items-center justify-center rounded-2xl bg-emerald-50 p-8 sm:min-h-96">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={`${product.title} পণ্যের ছবি`}
            width={360}
            height={440}
            unoptimized
            className="max-h-[28rem] w-auto max-w-full object-contain"
          />
        ) : (
          <p
            role="img"
            aria-label={`${product.title} পণ্যের ছবি নেই`}
            className="flex aspect-[3/4] w-40 items-center justify-center rounded-xl bg-white px-4 text-center text-slate-500 sm:w-56"
          >
            পণ্যের ছবি যোগ করা হয়নি
          </p>
        )}
      </div>

      <div className="flex flex-col justify-center">
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-emerald-700">
          {productType && (
            <span className="rounded-full bg-emerald-50 px-3 py-1">
              {productType.label}
            </span>
          )}
          {product.category && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              {product.category}
            </span>
          )}
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
          {product.title}
        </h1>
        {(product.author || product.publisher) && (
          <p className="mt-3 text-slate-600">
            {[product.author, product.publisher].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-5 whitespace-pre-line leading-8 text-slate-600">
          {product.description}
        </p>

        {product.commerce_mode === "direct" ? (
          product.price === null ? (
            <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              এই পণ্যের নিজস্ব বিক্রির মূল্য নির্ধারিত নেই; অর্ডার করা যাবে না।
            </p>
          ) : (
            <section className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-2xl font-extrabold text-emerald-800">
                {formatBDT(product.price)}
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-900">
                এটি শিক্ষা নগরীর নিজস্ব বিক্রির পণ্য; অর্ডার সাইটের checkout-এ
                জমা হবে।
              </p>
              <Link
                href={`/checkout?product=${encodeURIComponent(product.id)}`}
                className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800"
              >
                অর্ডারের জন্য এগিয়ে যান
              </Link>
            </section>
          )
        ) : affiliateLinks === null ? (
          <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            পার্টনার লিংক ডেটাবেসে এখনো চালু হয়নি।
          </p>
        ) : activeAffiliateLinks.length > 0 ? (
          <section className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <h2 className="font-bold text-emerald-950">
              বাইরের বিক্রেতার কাছে পণ্যটি দেখুন
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              এই affiliate link থেকে শিক্ষা নগরী কমিশন পেতে পারে। বিক্রেতার
              সাইটে বর্তমান মূল্য, মজুত ও শর্ত যাচাই করুন।
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {activeAffiliateLinks.map((link) => {
                const partnerName =
                  link.partner === "rokomari"
                    ? "Rokomari"
                    : link.partner === "10_minute_school"
                      ? "10 Minute School"
                      : "পার্টনার";

                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
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
        ) : (
          <p className="mt-7 rounded-xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
            এই পণ্যের জন্য কোনো সক্রিয় কেনার লিংক নেই। শিক্ষা নগরী বাইরের
            বিক্রেতার পেমেন্ট বা ডেলিভারি পরিচালনা করে না।
          </p>
        )}

        <div className="mt-5 max-w-xs">
          <WishlistButton slug={product.slug} />
        </div>
        <Link
          href="/products"
          className="mt-7 inline-flex min-h-11 w-fit items-center rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          ← সব পণ্যে ফিরুন
        </Link>
      </div>
    </article>
  );
}

export default function ProductDetailsPage({ params }: ProductPageProps) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">/</span>
          <Link
            href="/products"
            className="font-semibold text-emerald-800 hover:underline"
          >
            অন্যান্য পণ্য
          </Link>
        </nav>
        <Suspense
          fallback={
            <div className="mt-7 h-96 animate-pulse rounded-3xl bg-white" />
          }
        >
          <ProductDetails params={params} />
        </Suspense>
      </div>
    </main>
  );
}
