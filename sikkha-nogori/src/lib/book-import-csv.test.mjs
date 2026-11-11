import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_BOOK_IMPORT_ROWS, prepareBookImportCsv } from "./book-import-csv.mjs";

const partnerDomains = new Map([
  ["rkmri.co", "rokomari"],
  ["10ms.io", "10_minute_school"],
]);
const headers = [
  "product_name","product_type","slug","description","author_names","publisher_name",
  "brand_name","instructor_names","category_paths","primary_category","affiliate_url",
  "image_url","isbn","edition","page_count","language","country","weight_kg",
  "cost_price","selling_price","list_price","sales_type","bestseller",
];
const header = headers.join(",");
function makeRow(overrides = {}) {
  const values = {
    product_name: "নমুনা বই", product_type: "book", slug: "", description: "",
    author_names: "আরিফ আজাদ", publisher_name: "সমকালীন প্রকাশন", brand_name: "",
    instructor_names: "", category_paths: "", primary_category: "",
    affiliate_url: "https://rkmri.co/book/123", image_url: "https://images.example.com/book.jpg",
    isbn: "", edition: "", page_count: "", language: "বাংলা", country: "বাংলাদেশ",
    weight_kg: "", cost_price: "", selling_price: "", list_price: "",
    sales_type: "affiliate", bestseller: "false", ...overrides,
  };
  return headers.map((key) => {
    const value = String(values[key] ?? "");
    return /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
  }).join(",");
}
function csv(...rows) { return [header, ...rows].join("\n"); }

test("parses metadata and preserves supplied product name and URLs exactly", () => {
  const result = prepareBookImportCsv(csv(makeRow({
    product_name: ' বই, এক "বিশেষ" ',
    affiliate_url: "https://RKMRI.CO/book/123",
    image_url: "https://Images.Example.com/book.jpg",
  })), partnerDomains);
  assert.equal(result.error, undefined);
  assert.equal(result.rows[0].status, "ready");
  assert.equal(result.rows[0].bookName, ' বই, এক "বিশেষ" ');
  assert.equal(result.rows[0].affiliateUrl, "https://RKMRI.CO/book/123");
  assert.equal(result.rows[0].imageUrl, "https://Images.Example.com/book.jpg");
  assert.equal(result.rows[0].partner, "rokomari");
  assert.deepEqual(result.rows[0].authors, ["আরিফ আজাদ"]);
});

test("marks empty names and unsafe or unsupported URLs invalid", () => {
  const result = prepareBookImportCsv(csv(
    makeRow({ product_name: "" }),
    makeRow({ product_name: "বই ২", affiliate_url: "javascript:alert(1)" }),
    makeRow({ product_name: "বই ৩", affiliate_url: "https://unknown.example/book" }),
    makeRow({ product_name: "বই ৪", image_url: "data:image/png;base64,abc" }),
  ), partnerDomains);
  assert.deepEqual(result.rows.map((row) => row.status), ["invalid","invalid","invalid","invalid"]);
  assert.match(result.rows[0].reasons.join(" "), /নাম খালি/);
  assert.match(result.rows[1].reasons.join(" "), /HTTPS/);
  assert.match(result.rows[3].reasons.join(" "), /Image URL/);
});

test("rejects malformed CSV, missing headers, and inconsistent columns", () => {
  assert.match(prepareBookImportCsv(header, partnerDomains).error, /অন্তত একটি data row/);
  assert.match(prepareBookImportCsv(`${header}\n"অসমাপ্ত,https://rkmri.co/a`, partnerDomains).error, /অসমাপ্ত quoted field/);
  assert.match(prepareBookImportCsv("name,url,image\nবই,a,b", partnerDomains).error, /header/);
  const inconsistent = prepareBookImportCsv(`${header}\n${makeRow()},extra`, partnerDomains);
  assert.equal(inconsistent.rows[0].status, "invalid");
  assert.match(inconsistent.rows[0].reasons.join(" "), /কলামের সংখ্যা/);
});

test("marks all in-file duplicate names, affiliate URLs, and supplied slugs", () => {
  const result = prepareBookImportCsv(csv(
    makeRow({ product_name: "একই বই", slug: "same-book", affiliate_url: "https://rkmri.co/book/1" }),
    makeRow({ product_name: "একই বই", slug: "same-book-2", affiliate_url: "https://rkmri.co/book/2" }),
    makeRow({ product_name: "অন্য বই", slug: "other-book", affiliate_url: "https://rkmri.co/book/1" }),
    makeRow({ product_name: "তৃতীয় বই", slug: "same-book", affiliate_url: "https://10ms.io/book/4" }),
  ), partnerDomains);
  assert.deepEqual(result.rows.map((row) => row.status), ["duplicate","duplicate","duplicate","duplicate"]);
});

test("accepts direct-sale rows and Smart Catalog metadata", () => {
  const result = prepareBookImportCsv(csv(
    makeRow({ product_name: "নতুন বই", slug: "new-book", author_names: "লেখক ১|লেখক ২", category_paths: "Books › ধর্মীয় বই", primary_category: "Books › ধর্মীয় বই", bestseller: "true" }),
    makeRow({ product_name: "অনলাইন কোর্স", product_type: "course", slug: "online-course", sales_type: "direct", affiliate_url: "", selling_price: "1200", author_names: "", publisher_name: "", instructor_names: "শিক্ষক" }),
  ), partnerDomains);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].status, "ready");
  assert.deepEqual(result.rows[0].authors, ["লেখক ১","লেখক ২"]);
  assert.equal(result.rows[0].bestseller, true);
  assert.equal(result.rows[1].status, "ready");
  assert.equal(result.rows[1].salesType, "direct");
});

test("supports legacy three-column affiliate book CSV", () => {
  const result = prepareBookImportCsv(
    "book_name,affiliate_url,image_url\nবই,https://rkmri.co/book/9,https://images.example.com/9.jpg",
    partnerDomains,
  );
  assert.equal(result.error, undefined);
  assert.equal(result.rows[0].status, "ready");
  assert.equal(result.rows[0].salesType, "affiliate");
});

test("enforces the configured maximum row count", () => {
  const tooManyRows = [
    header,
    ...Array.from({ length: MAX_BOOK_IMPORT_ROWS + 1 }, (_, index) => makeRow({
      product_name: `বই ${index + 1}`,
      affiliate_url: `https://rkmri.co/book/${index + 1}`,
      slug: `book-${index + 1}`,
    })),
  ].join("\n");
  assert.match(prepareBookImportCsv(tooManyRows, partnerDomains).error, /সর্বোচ্চ/);
});
