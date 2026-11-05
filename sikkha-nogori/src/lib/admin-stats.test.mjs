import assert from "node:assert/strict";
import test from "node:test";
import { bestSellers, summarizeOrders } from "./admin-stats.mjs";

test("sales count only verified payments, in Dhaka time", () => {
  const now = new Date("2026-11-03T10:00:00Z");
  const stats = summarizeOrders(
    [
      { status: "pending", payment_status: "verified", total_amount: "100", created_at: "2026-11-03T05:00:00Z" },
      { status: "delivered", payment_status: "verified", total_amount: 50, created_at: "2026-10-20T05:00:00Z" },
      { status: "cancelled", payment_status: "awaiting", total_amount: 999, created_at: "2026-11-03T05:00:00Z" },
    ],
    now,
  );
  assert.equal(stats.totalOrders, 3);
  assert.equal(stats.pending, 1);
  assert.equal(stats.completed, 1);
  assert.equal(stats.cancelled, 1);
  assert.equal(stats.totalSales, 150);
  assert.equal(stats.todaySales, 100);
  assert.equal(stats.monthSales, 100);
});

test("best sellers are ranked by quantity", () => {
  const top = bestSellers([
    { product_title: "A", quantity: 1 },
    { product_title: "B", quantity: 3 },
    { product_title: "A", quantity: 1 },
  ]);
  assert.deepEqual(top, [
    { title: "B", quantity: 3 },
    { title: "A", quantity: 2 },
  ]);
});
