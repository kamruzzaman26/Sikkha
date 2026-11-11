const merchantReferencePattern = /^[A-Za-z0-9_-]{8,30}$/;

function sameMoney(left, right) {
  const a = Number(left);
  const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0
    && a.toFixed(2) === b.toFixed(2);
}

/**
 * Parse only the fields required to identify a legitimate BDT IPN.
 * Provider validation is still required before any payment is completed.
 */
export function parseSslcommerzIpn(rawBody) {
  const payload = new URLSearchParams(rawBody);
  const merchantReference = payload.get("tran_id")?.trim() ?? "";
  const status = payload.get("status")?.trim().toUpperCase() ?? "";
  const amountText = payload.get("amount")?.trim() ?? "";
  const currency = payload.get("currency")?.trim().toUpperCase() ?? "";

  if (
    !merchantReferencePattern.test(merchantReference)
    || !/^(?:0|[1-9]\\d*)(?:\\.\\d{1,2})?$/.test(amountText)
    || !Number.isFinite(Number(amountText))
    || Number(amountText) <= 0
    || currency !== "BDT"
  ) {
    return null;
  }

  return {
    payload,
    merchantReference,
    status,
    amount: Number(amountText),
    currency,
    providerTransactionId: payload.get("bank_tran_id")?.trim() || merchantReference,
  };
}

export function isValidSslcommerzSuccess(validation, transaction, merchantReference) {
  return (
    ["VALID", "VALIDATED"].includes(String(validation?.status ?? "").toUpperCase())
    && validation?.tran_id === merchantReference
    && typeof validation?.val_id === "string" && validation.val_id.trim().length > 0
    && sameMoney(validation?.amount, transaction?.amount)
    && String(validation?.currency ?? "").toUpperCase() === transaction?.currency
    && String(validation?.risk_level ?? "0") !== "1"
  );
}

export function isValidSslcommerzFailure(validation, transaction, merchantReference, expectedStatus) {
  return (
    ["FAILED", "CANCELLED"].includes(expectedStatus)
    && String(validation?.status ?? "").toUpperCase() === expectedStatus
    && validation?.tran_id === merchantReference
    && sameMoney(validation?.amount, transaction?.amount)
    && String(validation?.currency ?? "").toUpperCase() === transaction?.currency
  );
}
