import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCategoryMarkdown,
  pickSlug,
  slugifyAscii,
} from "./category-markdown.mjs";

test("parses nested bullets with optional slugs", () => {
  const { items, errors } = parseCategoryMarkdown(
    "- কৃষি ও কৃষক | agriculture\n  - মৎস্য চাষ\n  - গবাদি পশু\n- উপন্যাস\n  - সমকালীন\n    - আরও",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(
    items.map((i) => [i.name, i.depth, i.parent, i.slug]),
    [
      ["কৃষি ও কৃষক", 0, null, "agriculture"],
      ["মৎস্য চাষ", 1, 0, null],
      ["গবাদি পশু", 1, 0, null],
      ["উপন্যাস", 0, null, null],
      ["সমকালীন", 1, 3, null],
      ["আরও", 2, 4, null],
    ],
  );
});

test("accepts plain lines and tabs, ignores blanks", () => {
  const { items, errors } = parseCategoryMarkdown("A\n\n\tB\nC");
  assert.deepEqual(errors, []);
  assert.deepEqual(items.map((i) => [i.name, i.depth]), [["A", 0], ["B", 1], ["C", 0]]);
});

test("rejects bad slugs, empty input and indented first line", () => {
  assert.ok(parseCategoryMarkdown("- A | Bad Slug").errors.length > 0);
  assert.ok(parseCategoryMarkdown("   \n").errors.length > 0);
  assert.ok(parseCategoryMarkdown("  - A").errors.length > 0);
});

test("slugs are unique per group and fall back for Bangla names", () => {
  const taken = new Set(["fiction"]);
  assert.equal(slugifyAscii("Fiction & More"), "fiction-more");
  assert.equal(pickSlug({ preferred: null, name: "Fiction", group: "books", taken }), "fiction-2");
  assert.equal(pickSlug({ preferred: null, name: "কৃষি", group: "books", taken }), "books-1");
  assert.equal(pickSlug({ preferred: null, name: "গল্প", group: "books", taken }), "books-2");
});
