import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProductImageUrl } from "./product-image-url.mjs";

test("accepts HTTPS image URLs and normalizes whitespace and hostname casing", () => {
  assert.equal(
    parseProductImageUrl("  https://Images.Example.com/books/cover.jpg  "),
    "https://images.example.com/books/cover.jpg",
  );
});

test("rejects insecure, credentialed, local, and IP-literal image URLs", () => {
  for (const value of [
    "http://images.example.com/cover.jpg",
    "https://user:password@images.example.com/cover.jpg",
    "https://images.example.com:8443/cover.jpg",
    "https://localhost/cover.jpg",
    "https://books.local/cover.jpg",
    "https://127.0.0.1/cover.jpg",
    "https://[::1]/cover.jpg",
    "not-a-url",
  ]) {
    assert.equal(parseProductImageUrl(value), undefined, value);
  }
});

test("rejects empty and overlong image URLs", () => {
  assert.equal(parseProductImageUrl("  "), undefined);
  assert.equal(
    parseProductImageUrl(`https://images.example.com/${"a".repeat(2048)}`),
    undefined,
  );
});
