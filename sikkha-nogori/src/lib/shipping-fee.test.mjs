import assert from "node:assert/strict";
import test from "node:test";
import { getShippingCharge, isShippingZone } from "./shipping-fee.mjs";

test("Rokomari-inspired starting delivery charges by delivery zone", () => {
  assert.equal(getShippingCharge("dhaka_city"), 48);
  assert.equal(getShippingCharge("district_town"), 52);
  assert.equal(getShippingCharge("remote_union"), 57);
});

test("digital-only orders do not add a delivery charge", () => {
  assert.equal(getShippingCharge("no_shipping"), 0);
});

test("unknown zones are rejected", () => {
  assert.equal(getShippingCharge("unknown"), undefined);
  assert.equal(isShippingZone("unknown"), false);
});
