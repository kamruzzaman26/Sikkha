import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  canTransitionOrder,
  parseCheckoutForm,
  parseTransactionReference,
} from "./order-workflow.mjs";

const orderId = "10000000-0000-4000-8000-000000000001";
const paymentMethodId = "20000000-0000-4000-8000-000000000002";
const idempotencyKey = "30000000-0000-4000-8000-000000000003";
const checkoutValues = {
  idempotencyKey,
  paymentMethodId,
  customerName: "শিক্ষার্থী",
  customerPhone: "+880 1712-345678",
  deliveryAddress: "ঢাকা, বাংলাদেশে সম্পূর্ণ ঠিকানা",
  productId: orderId,
  [`quantity-${orderId}`]: "2",
};

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) {
    result.set(key, value);
  }
  return result;
}

test("parses only bounded checkout quantities and customer details", () => {
  assert.deepEqual(parseCheckoutForm(form(checkoutValues)), {
    idempotencyKey,
    paymentMethodId,
    customerName: "শিক্ষার্থী",
    customerPhone: "+880 1712-345678",
    deliveryAddress: "ঢাকা, বাংলাদেশে সম্পূর্ণ ঠিকানা",
    items: [{ product_id: orderId, quantity: 2 }],
  });
  assert.equal(
    parseCheckoutForm(
      form({ ...checkoutValues, [`quantity-${orderId}`]: "100" }),
    ),
    undefined,
  );
  assert.equal(
    parseCheckoutForm(
      form({
        ...checkoutValues,
        customerPhone: "+৮৮০ ১৭১২-৩৪৫৬৭৮",
      }),
    )?.customerPhone,
    "+880 1712-345678",
  );
  assert.equal(
    parseCheckoutForm(form({ ...checkoutValues, productId: "not-a-uuid" })),
    undefined,
  );
});

test("rejects duplicate products and unsafe transaction references", () => {
  const duplicateItems = form(checkoutValues);
  duplicateItems.append("productId", orderId);
  assert.equal(parseCheckoutForm(duplicateItems), undefined);
  const uppercaseDuplicate = form(checkoutValues);
  uppercaseDuplicate.set("productId", orderId.toUpperCase());
  uppercaseDuplicate.set(`quantity-${orderId.toUpperCase()}`, "2");
  uppercaseDuplicate.append("productId", orderId);
  assert.equal(parseCheckoutForm(uppercaseDuplicate), undefined);
  assert.equal(parseTransactionReference("TXN-12345"), "TXN-12345");
  assert.equal(parseTransactionReference("ref with spaces"), undefined);
  assert.equal(parseTransactionReference("x"), undefined);
});

test("enforces order transitions and manual payment verification", () => {
  assert.equal(
    canTransitionOrder({
      currentStatus: "pending",
      nextStatus: "confirmed",
      paymentMethodType: "manual",
      paymentStatus: "submitted",
    }),
    false,
  );
  assert.equal(
    canTransitionOrder({
      currentStatus: "pending",
      nextStatus: "confirmed",
      paymentMethodType: "manual",
      paymentStatus: "verified",
    }),
    true,
  );
  assert.equal(
    canTransitionOrder({
      currentStatus: "shipped",
      nextStatus: "processing",
      paymentMethodType: "cod",
      paymentStatus: "awaiting",
    }),
    false,
  );
  assert.equal(
    canTransitionOrder({
      currentStatus: "pending",
      nextStatus: "cancelled",
      paymentMethodType: "manual",
      paymentStatus: "submitted",
    }),
    false,
  );
});

test("migration restricts writes and verifies prices, ownership, and payment transitions", async () => {
  const migration = await readFile(
    new URL("../../../supabase/migrations/202610250003_orders_checkout.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /unique \(user_id, idempotency_key\)/);
  assert.match(migration, /price >= 0\s+for share/i);
  assert.match(migration, /where id = requested_product_id\s+and is_published/i);
  assert.match(migration, /user_id = requesting_user/i);
  assert.match(migration, /revoke all on public\.orders from public, anon, authenticated/i);
  assert.doesNotMatch(
    migration,
    /grant\s+(?:insert|update|delete)\s+on public\.(?:orders|order_items|order_payment_submissions)/i,
  );
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /create policy "Customers and admins can read orders"/i);
  assert.match(migration, /grant execute on function public\.place_order[\s\S]+to authenticated/i);
  assert.match(migration, /revoke all on function public\.place_order[\s\S]+from public, anon/i);
  assert.match(migration, /role = 'admin'/i);
  assert.match(migration, /payment_status <> 'verified'/i);
  assert.match(migration, /payment_method_type = 'manual'[\s\S]+payment_status <> 'verified'/i);
  assert.match(migration, /lower\(transaction_reference\)/i);
});
