import assert from "node:assert/strict";
import test from "node:test";
import { estimateDeliveryDate, formatDeliveryDate, normalizeDeliveryDays } from "./delivery-estimate.mjs";

const day = (date) => date.toISOString().slice(0, 10);

test("today counts as day one: 7 days from the 6th is the 12th", () => {
  assert.equal(day(estimateDeliveryDate(new Date("2026-11-06T06:00:00Z"), 7)), "2026-11-12");
});

test("uses the Dhaka calendar day, not UTC", () => {
  // 19:00 UTC on the 6th is already the 7th in Dhaka.
  assert.equal(day(estimateDeliveryDate(new Date("2026-11-06T19:00:00Z"), 7)), "2026-11-13");
  assert.equal(day(estimateDeliveryDate(new Date("2026-11-06T17:59:00Z"), 7)), "2026-11-12");
});

test("crosses month and year ends", () => {
  assert.equal(day(estimateDeliveryDate(new Date("2026-12-28T06:00:00Z"), 7)), "2027-01-03");
});

test("formats a Bangla date with the weekday", () => {
  const text = formatDeliveryDate(estimateDeliveryDate(new Date("2026-11-06T06:00:00Z"), 7));
  assert.match(text, /১২/);
  assert.match(text, /নভেম্বর/);
  assert.match(text, /বৃহস্পতিবার/);
});

test("days setting: default 7, 0 hides, bad values fall back", () => {
  assert.equal(normalizeDeliveryDays(undefined), 7);
  assert.equal(normalizeDeliveryDays(""), 7);
  assert.equal(normalizeDeliveryDays(0), 0);
  assert.equal(normalizeDeliveryDays("5"), 5);
  assert.equal(normalizeDeliveryDays(-2), 7);
  assert.equal(normalizeDeliveryDays(99), 7);
  assert.equal(normalizeDeliveryDays(2.5), 7);
});
