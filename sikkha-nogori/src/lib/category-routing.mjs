export function getHomeCategoryHref(category) {
  const name = String(category?.name ?? "").trim();
  const group = category?.category_group;
  if (group === "courses") return `/courses?category=${encodeURIComponent(name)}`;
  if (group === "books") {
    if (name === "শিক্ষা কুইজ" || name === "Education Quiz") return "/quiz";
    if (name === "বই") return "/books";
    return `/books?category=${encodeURIComponent(name)}`;
  }
  if (name === "ই-বুক" || name.toLowerCase() === "ebook") {
    return `/books?category=${encodeURIComponent("ই-বুক")}`;
  }
  return `/products?category=${encodeURIComponent(name)}`;
}
