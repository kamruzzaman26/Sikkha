export const WISHLIST_STORAGE_KEY = "sikkha-nogori:wishlist";
export const WISHLIST_CHANGE_EVENT = "sikkha-nogori:wishlist-change";

export type WishlistEntry = {
  slug: string;
  title: string;
  href: string;
  category: string | null;
  imageUrl: string | null;
};

export function readWishlist(): string[] {
  const storedValue = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
  if (!storedValue) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(storedValue);
  if (
    !Array.isArray(parsedValue) ||
    !parsedValue.every((slug): slug is string => typeof slug === "string")
  ) {
    throw new Error("উইশলিস্টের সংরক্ষিত তথ্য পড়া যায়নি।");
  }

  return [...new Set(parsedValue)];
}

export function writeWishlist(slugs: string[]): void {
  const uniqueSlugs = [...new Set(slugs)];
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(uniqueSlugs));
  window.dispatchEvent(new Event(WISHLIST_CHANGE_EVENT));
}
