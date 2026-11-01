import { connection } from "next/server";
import HomePage from "@/components/home-page";
import type { Book } from "@/lib/books";
import { getPublishedBooks, toCatalogBook } from "@/lib/catalog";
import {
  getActiveAffiliateLinkMap,
  type PublicAffiliateLink,
} from "@/lib/supabase/affiliate-links";

async function loadPublishedBooks(): Promise<Book[] | null> {
  try {
    const result = await getPublishedBooks({
      page: 1,
      query: "",
      sort: "newest",
      pageSize: 48,
    });
    return result ? result.products.map(toCatalogBook) : null;
  } catch (error) {
    console.error("Unable to load books for the home page.", error);
    return null;
  }
}

export default async function Home() {
  await connection();

  const publishedBooks = await loadPublishedBooks();
  const buyLinks: Record<string, PublicAffiliateLink> = publishedBooks
    ? await getActiveAffiliateLinkMap(
        publishedBooks
          .filter((book) => book.commerceMode === "affiliate")
          .map((book) => book.slug),
      )
    : {};

  return <HomePage publishedBooks={publishedBooks} buyLinks={buyLinks} />;
}
