import type { Metadata } from "next";
import { Suspense } from "react";
import { WishlistContent } from "@/components/wishlist-content";
import { books as sampleBooks } from "@/lib/books";
import { getPublishedWishlistProducts } from "@/lib/catalog";
import type { WishlistEntry } from "@/lib/wishlist";

export const metadata: Metadata = {
  title: "উইশলিস্ট | শিক্ষা নগরী",
  description: "এই ব্রাউজারে সংরক্ষিত পণ্যের তালিকা।",
};

async function WishlistData() {
  const products = await getPublishedWishlistProducts();
  const entries: WishlistEntry[] =
    products === null
      ? sampleBooks.map((book) => ({
          slug: book.slug,
          title: book.title,
          href: `/books/${book.slug}`,
          category: book.category,
          imageUrl: null,
        }))
      : products.map((product) => ({
          slug: product.slug,
          title: product.title,
          href:
            product.product_type === "book"
              ? `/books/${product.slug}`
              : product.product_type === "course"
                ? `/courses/${product.slug}`
                : `/products/${product.slug}`,
          category: product.category,
          imageUrl: product.image_url,
        }));

  return <WishlistContent entries={entries} />;
}

export default function WishlistPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[60vh] bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p role="status" className="rounded-xl bg-white px-5 py-8 text-slate-600">
              উইশলিস্ট প্রস্তুত হচ্ছে…
            </p>
          </div>
        </main>
      }
    >
      <WishlistData />
    </Suspense>
  );
}
