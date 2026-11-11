import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isValidSslcommerzFailure,
  isValidSslcommerzSuccess,
  parseSslcommerzIpn,
} from "./sslcommerz-ipn.mjs";

const transaction = { amount: "1250.00", currency: "BDT" };
const reference = "SN1234567890abcdef12345678";

test("parses a well-formed BDT IPN without treating it as proof of payment", () => {
  const parsed = parseSslcommerzIpn(
    new URLSearchParams({
      tran_id: reference,
      status: "valid",
      amount: "1250.00",
      currency: "bdt",
      bank_tran_id: "BANK-123",
    }).toString(),
  );

  assert.ok(parsed);
  assert.equal(parsed.merchantReference, reference);
  assert.equal(parsed.status, "VALID");
  assert.equal(parsed.amount, 1250);
  assert.equal(parsed.currency, "BDT");
  assert.equal(parsed.providerTransactionId, "BANK-123");
});

test("rejects malformed references, amounts, and non-BDT notifications", () => {
  const base = { tran_id: reference, status: "VALID", amount: "1250.00", currency: "BDT" };
  for (const values of [
    { ...base, tran_id: "bad ref" },
    { ...base, tran_id: "short" },
    { ...base, amount: "0" },
    { ...base, amount: "-10" },
    { ...base, amount: "1e3" },
    { ...base, amount: "12.345" },
    { ...base, amount: "NaN" },
    { ...base, currency: "USD" },
  ]) {
    assert.equal(parseSslcommerzIpn(new URLSearchParams(values).toString()), null);
  }
});

test("accepts provider-validated success only when reference, amount, currency and risk match", () => {
  const valid = {
    status: "VALID",
    tran_id: reference,
    val_id: "VAL-123",
    amount: "1250",
    currency: "BDT",
    risk_level: "0",
  };
  assert.equal(isValidSslcommerzSuccess(valid, transaction, reference), true);
  assert.equal(
    isValidSslcommerzSuccess({ ...valid, amount: "1250.01" }, transaction, reference),
    false,
  );
  assert.equal(
    isValidSslcommerzSuccess({ ...valid, tran_id: "OTHER-REFERENCE" }, transaction, reference),
    false,
  );
  assert.equal(
    isValidSslcommerzSuccess({ ...valid, currency: "USD" }, transaction, reference),
    false,
  );
  assert.equal(
    isValidSslcommerzSuccess({ ...valid, risk_level: "1" }, transaction, reference),
    false,
  );
  assert.equal(
    isValidSslcommerzSuccess({ ...valid, val_id: "" }, transaction, reference),
    false,
  );
  assert.equal(
    isValidSslcommerzSuccess({ ...valid, val_id: 123 }, transaction, reference),
    false,
  );
  assert.equal(
    isValidSslcommerzSuccess({ ...valid, status: "FAILED" }, transaction, reference),
    false,
  );
  assert.equal(
    isValidSslcommerzSuccess({ ...valid, amount: "not-a-number" }, transaction, reference),
    false,
  );
});

test("accepts failed and cancelled notifications only after matching provider status query", () => {
  for (const status of ["FAILED", "CANCELLED"]) {
    const queried = {
      status,
      tran_id: reference,
      amount: "1250.00",
      currency: "BDT",
    };
    assert.equal(isValidSslcommerzFailure(queried, transaction, reference, status), true);
    assert.equal(
      isValidSslcommerzFailure({ ...queried, status: "VALID" }, transaction, reference, status),
      false,
    );
    assert.equal(
      isValidSslcommerzFailure({ ...queried, amount: "1251" }, transaction, reference, status),
      false,
    );
    assert.equal(
      isValidSslcommerzFailure({ ...queried, tran_id: "OTHER" }, transaction, reference, status),
      false,
    );
  }
  assert.equal(
    isValidSslcommerzFailure(
      { status: "FAILED", tran_id: reference, amount: "1250", currency: "BDT" },
      transaction,
      reference,
      "VALID",
    ),
    false,
  );
});
