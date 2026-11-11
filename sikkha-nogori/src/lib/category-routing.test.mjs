import test from "node:test";
import assert from "node:assert/strict";
import { getHomeCategoryHref } from "./category-routing.mjs";

test("book root opens the complete book catalog", () => {
  assert.equal(getHomeCategoryHref({ name: "বই", category_group: "books" }), "/books");
});
test("education quiz opens its own destination", () => {
  assert.equal(getHomeCategoryHref({ name: "শিক্ষা কুইজ", category_group: "books" }), "/quiz");
});
test("ebook opens the book catalog while Kids Zone opens product catalog", () => {
  assert.equal(getHomeCategoryHref({ name: "ই-বুক", category_group: "products" }), "/books?category=%E0%A6%87-%E0%A6%AC%E0%A7%81%E0%A6%95");
  assert.equal(getHomeCategoryHref({ name: "কিডস জোন", category_group: "products" }), "/products?category=%E0%A6%95%E0%A6%BF%E0%A6%A1%E0%A6%B8%20%E0%A6%9C%E0%A7%8B%E0%A6%A8");
});
test("course categories remain in the course catalog", () => {
  assert.equal(getHomeCategoryHref({ name: "Skills", category_group: "courses" }), "/courses?category=Skills");
});
