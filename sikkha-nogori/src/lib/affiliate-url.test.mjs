import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAffiliateUrl } from "./affiliate-url.mjs";

const entryHostnames = new Set(["rkmri.co", "10ms.io"]);

test("accepts HTTPS links on the approved affiliate entry hosts", () => {
  assert.equal(
    parseAffiliateUrl("https://rkmri.co/y2m05AeNIyAA/", entryHostnames),
    "https://rkmri.co/y2m05AeNIyAA/",
  );
  assert.equal(
    parseAffiliateUrl("https://10ms.io/5L29ou", entryHostnames),
    "https://10ms.io/5L29ou",
  );
});

test("does not treat final destinations as approved entry hosts", () => {
  assert.equal(
    parseAffiliateUrl("https://www.rokomari.com/book", entryHostnames),
    undefined,
  );
  assert.equal(
    parseAffiliateUrl("https://10minuteschool.com/course", entryHostnames),
    undefined,
  );
});

test("rejects non-HTTPS, credentials, unexpected ports, and malformed URLs", () => {
  for (const value of [
    "http://rkmri.co/book",
    "https://user:password@rkmri.co/book",
    "https://rkmri.co:8443/book",
    "https://rkmri.co.evil.example/book",
    "https://%zz",
  ]) {
    assert.equal(parseAffiliateUrl(value, entryHostnames), undefined, value);
  }
});

test("accepts only exact hostnames and enforces the URL length limit", () => {
  assert.equal(
    parseAffiliateUrl("https://sub.rkmri.co/book", entryHostnames),
    undefined,
  );
  assert.equal(
    parseAffiliateUrl(`https://rkmri.co/${"a".repeat(2048)}`, entryHostnames),
    undefined,
  );
});

test("normalizes whitespace and host casing before validation", () => {
  assert.equal(
    parseAffiliateUrl("  https://RKMRI.CO/abc  ", entryHostnames),
    "https://rkmri.co/abc",
  );
});
