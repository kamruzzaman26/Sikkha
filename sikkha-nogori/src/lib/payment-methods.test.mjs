import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCustomerVisiblePaymentMethod,
  parsePaymentMethodForm,
} from "./payment-methods.mjs";

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) {
    result.set(key, value);
  }
  return result;
}

const validMethod = {
  name: "bKash",
  code: "bkash",
  methodType: "manual",
  description: "ম্যানুয়াল পেমেন্ট",
  instructions: "লেনদেন নম্বর দিন",
  isEnabled: "true",
  sortOrder: "10",
};

test("validates manual and COD payment method data", () => {
  assert.deepEqual(parsePaymentMethodForm(form(validMethod)), {
    name: "bKash",
    code: "bkash",
    method_type: "manual",
    description: "ম্যানুয়াল পেমেন্ট",
    instructions: "লেনদেন নম্বর দিন",
    is_enabled: true,
    sort_order: 10,
    configuration: {},
  });
  assert.equal(
    parsePaymentMethodForm(
      form({ ...validMethod, methodType: "cod", isEnabled: "false" })
    )?.method_type,
    "cod",
  );
  assert.equal(
    parsePaymentMethodForm(
      form({
        ...validMethod,
        isEnabled: "false",
      }),
    )?.is_enabled,
    false,
  );
  const checkedForm = form({ ...validMethod, isEnabled: "false" });
  checkedForm.append("isEnabled", "true");
  assert.equal(parsePaymentMethodForm(checkedForm)?.is_enabled, true);
});

test("rejects invalid values and enabled gateway methods", () => {
  for (const values of [
    { ...validMethod, code: "BKASH" },
    { ...validMethod, code: "bkash code" },
    { ...validMethod, methodType: "unknown" },
    { ...validMethod, sortOrder: "-1" },
    { ...validMethod, isEnabled: "yes" },
    { ...validMethod, methodType: "gateway" },
    { ...validMethod, instructions: "x".repeat(3001) },
  ]) {
    assert.equal(parsePaymentMethodForm(form(values)), undefined);
  }
});

test("public visibility excludes disabled and unsupported gateway methods", () => {
  assert.equal(
    isCustomerVisiblePaymentMethod({
      is_enabled: true,
      method_type: "manual",
    }),
    true,
  );
  assert.equal(
    isCustomerVisiblePaymentMethod({
      is_enabled: false,
      method_type: "manual",
    }),
    false,
  );
  assert.equal(
    isCustomerVisiblePaymentMethod({
      is_enabled: true,
      method_type: "gateway",
    }),
    false,
  );
});
