import assert from "node:assert/strict";
import test from "node:test";
import { collectCategoryIds, rootCategoryCounts } from "./category-tree.mjs";

const rows = [
  { id: "a", parent_id: null, name: "আত্ম-উন্নয়ন", sort_order: 2 },
  { id: "a1", parent_id: "a", name: "ক্যারিয়ার উন্নয়ন", sort_order: 1 },
  { id: "a2", parent_id: "a", name: "ইসলামি বই: আত্ম উন্নয়ন", sort_order: 2 },
  { id: "a21", parent_id: "a2", name: "গভীর", sort_order: 1 },
  { id: "n", parent_id: null, name: "উপন্যাস", sort_order: 1 },
  { id: "n1", parent_id: "n", name: "চিরায়ত উপন্যাস", sort_order: 1 },
  { id: "e", parent_id: null, name: "খালি", sort_order: 3 },
];

test("collectCategoryIds returns the category and all descendants", () => {
  assert.deepEqual(collectCategoryIds(rows, "আত্ম-উন্নয়ন").sort(), ["a", "a1", "a2", "a21"]);
  assert.deepEqual(collectCategoryIds(rows, "চিরায়ত উপন্যাস"), ["n1"]);
});

test("collectCategoryIds returns nothing for an unknown name", () => {
  assert.deepEqual(collectCategoryIds(rows, "নেই"), []);
});

test("collectCategoryIds survives a cycle in bad data", () => {
  const cyclic = [
    { id: "x", parent_id: "y", name: "X" },
    { id: "y", parent_id: "x", name: "Y" },
  ];
  assert.deepEqual(collectCategoryIds(cyclic, "X").sort(), ["x", "y"]);
});

test("rootCategoryCounts counts each product once per top-level category", () => {
  const links = [
    { category_id: "a1", product_id: "p1" },
    { category_id: "a2", product_id: "p2" },
    { category_id: "a21", product_id: "p2" },
    { category_id: "a", product_id: "p1" },
    { category_id: "n1", product_id: "p3" },
  ];
  assert.deepEqual(rootCategoryCounts(rows, links), [
    { name: "আত্ম-উন্নয়ন", count: 2 },
    { name: "উপন্যাস", count: 1 },
  ]);
});

test("rootCategoryCounts hides empty categories", () => {
  assert.deepEqual(rootCategoryCounts(rows, []), []);
});
