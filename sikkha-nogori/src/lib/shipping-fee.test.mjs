import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SHIPPING_CHARGES, getShippingCharge, getShippingCharges, isShippingZone } from "./shipping-fee.mjs";

test("default Rokomari-inspired delivery charges are available", () => {
  assert.equal(getShippingCharge("dhaka_city"), 48);
  assert.equal(getShippingCharge("district_town"), 52);
  assert.equal(getShippingCharge("remote_union"), 57);
  assert.equal(getShippingCharge("no_shipping"), 0);
});

test("admin-configured delivery charges override defaults", () => {
  const charges = getShippingCharges({ dhaka_city: 60, district_town: 75.5, remote_union: 90 });
  assert.equal(getShippingCharge("dhaka_city", charges), 60);
  assert.equal(getShippingCharge("district_town", charges), 75.5);
  assert.equal(getShippingCharge("remote_union", charges), 90);
  assert.equal(getShippingCharge("no_shipping", charges), 0);
});

test("invalid configured charges fall back safely", () => {
  const charges = getShippingCharges({ dhaka_city: -1, district_town: "bad", remote_union: 10001 });
  assert.equal(charges.dhaka_city, DEFAULT_SHIPPING_CHARGES.dhaka_city);
  assert.equal(charges.district_town, DEFAULT_SHIPPING_CHARGES.district_town);
  assert.equal(charges.remote_union, DEFAULT_SHIPPING_CHARGES.remote_union);
});

test("unknown zones are rejected", () => {
  assert.equal(getShippingCharge("unknown"), undefined);
  assert.equal(isShippingZone("unknown"), false);
});
