import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_BOOK_IMPORT_ROWS,
  prepareBookImportCsv,
} from "./book-import-csv.mjs";

const partnerDomains = new Map([
  ["rkmri.co", "rokomari"],
  ["10ms.io", "10_minute_school"],
]);
const header = "book_name,affiliate_url,image_url";

function row(
  name = "নমুনা বই",
  affiliateUrl = "https://rkmri.co/book/123",
  imageUrl = "https://images.example.com/book.jpg",
) {
  return `${name},${affiliateUrl},${imageUrl}`;
}

test("parses the required header and preserves supplied names and URLs exactly", () => {
  const csv =
    `${header}\n" বই, এক ""বিশেষ"" ","https://RKMRI.CO/book/123","https://Images.Example.com/book.jpg"`;
  const result = prepareBookImportCsv(csv, partnerDomains);

  assert.equal(result.error, undefined);
  assert.equal(result.rows[0].status, "ready");
  assert.equal(result.rows[0].bookName, ' বই, এক "বিশেষ" ');
  assert.equal(result.rows[0].affiliateUrl, "https://RKMRI.CO/book/123");
  assert.equal(
    result.rows[0].imageUrl,
    "https://Images.Example.com/book.jpg",
  );
  assert.equal(result.rows[0].partner, "rokomari");
});

test("marks an empty book name and unsafe or unsupported URLs invalid", () => {
  const csv = [
    header,
    row("", "https://rkmri.co/book/123"),
    row("বই ২", "javascript:alert(1)"),
    row("বই ৩", "https://unknown.example/book"),
    row("বই ৪", "https://rkmri.co/book/456", "data:image/png;base64,abc"),
  ].join("\n");
  const result = prepareBookImportCsv(csv, partnerDomains);

  assert.deepEqual(
    result.rows.map((entry) => entry.status),
    ["invalid", "invalid", "invalid", "invalid"],
  );
  assert.match(result.rows[0].reasons.join(" "), /নাম খালি/);
  assert.match(result.rows[1].reasons.join(" "), /HTTPS/);
  assert.match(result.rows[3].reasons.join(" "), /Image URL/);
});

test("rejects malformed CSV, missing headers, and inconsistent columns", () => {
  assert.match(
    prepareBookImportCsv(header, partnerDomains).error,
    /অন্তত একটি data row/,
  );
  assert.match(
    prepareBookImportCsv(`${header}\n"অসমাপ্ত,https://rkmri.co/a,https://images.example.com/a`, partnerDomains).error,
    /অসমাপ্ত quoted field/,
  );
  assert.match(
    prepareBookImportCsv("name,url,image\nবই,a,b", partnerDomains).error,
    /header/,
  );
  const inconsistent = prepareBookImportCsv(
    `${header}\n${row()},unexpected`,
    partnerDomains,
  );
  assert.equal(inconsistent.rows[0].status, "invalid");
  assert.match(inconsistent.rows[0].reasons.join(" "), /কলামের সংখ্যা/);
});

test("marks every duplicate in the CSV by normalized name or affiliate URL", () => {
  const result = prepareBookImportCsv(
    [
      header,
      row("একই বই", "https://rkmri.co/book/1"),
      row("একই বই", "https://rkmri.co/book/2"),
      row("অন্য বই", "https://rkmri.co/book/1"),
      row("  একই বই  ", "https://10ms.io/book/4"),
    ].join("\n"),
    partnerDomains,
  );

  assert.deepEqual(
    result.rows.map((entry) => entry.status),
    ["duplicate", "duplicate", "duplicate", "duplicate"],
  );
  assert.ok(result.rows.every((entry) => entry.reasons.length > 0));
});

test("accepts 23 or more data rows while enforcing the configured row limit", () => {
  const twentyThreeRows = [
    header,
    ...Array.from({ length: 23 }, (_, index) =>
      row(
        `বই ${index + 1}`,
        `https://rkmri.co/book/${index + 1}`,
        `https://images.example.com/${index + 1}.jpg`,
      ),
    ),
  ].join("\n");
  const result = prepareBookImportCsv(twentyThreeRows, partnerDomains);

  assert.equal(result.rows.length, 23);
  assert.ok(result.rows.every((entry) => entry.status === "ready"));

  const tooManyRows = [
    header,
    ...Array.from({ length: MAX_BOOK_IMPORT_ROWS + 1 }, (_, index) =>
      row(
        `বই ${index + 1}`,
        `https://rkmri.co/book/${index + 1}`,
        `https://images.example.com/${index + 1}.jpg`,
      ),
    ),
  ].join("\n");
  assert.match(
    prepareBookImportCsv(tooManyRows, partnerDomains).error,
    /সর্বোচ্চ/,
  );
});
