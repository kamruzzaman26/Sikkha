const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCheckoutForm(formData) {
  const value = (name) => {
    const entry = formData.get(name);
    return typeof entry === "string" ? entry.trim() : "";
  };

  const idempotencyKey = value("idempotencyKey");
  const paymentMethodId = value("paymentMethodId");
  const customerName = value("customerName");
  const customerPhone = value("customerPhone").replace(/[০-৯]/g, (digit) =>
    String(digit.charCodeAt(0) - "০".charCodeAt(0)),
  );
  const deliveryAddress = value("deliveryAddress");
  const productIds = formData
    .getAll("productId")
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""));

  if (
    !uuidPattern.test(idempotencyKey) ||
    !uuidPattern.test(paymentMethodId) ||
    customerName.length < 2 ||
    customerName.length > 100 ||
    customerPhone.length < 7 ||
    customerPhone.length > 25 ||
    !/^[+0-9][0-9+ ()-]{6,24}$/.test(customerPhone) ||
    customerPhone.replace(/[^0-9]/g, "").length < 7 ||
    deliveryAddress.length < 10 ||
    deliveryAddress.length > 1000 ||
    productIds.length < 1 ||
    productIds.length > 20
  ) {
    return undefined;
  }

  const seenProductIds = new Set();
  const items = [];
  for (const productId of productIds) {
    if (!uuidPattern.test(productId)) {
      return undefined;
    }
    const normalizedProductId = productId.toLowerCase();
    if (seenProductIds.has(normalizedProductId)) {
      return undefined;
    }
    seenProductIds.add(normalizedProductId);

    const quantityValue = value(`quantity-${productId}`);
    if (!/^[1-9]\d?$/.test(quantityValue)) {
      return undefined;
    }

    items.push({ product_id: productId, quantity: Number(quantityValue) });
  }

  return {
    idempotencyKey,
    paymentMethodId,
    customerName,
    customerPhone,
    deliveryAddress,
    items,
  };
}

export function parseTransactionReference(value) {
  const reference = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9][A-Za-z0-9._/-]{1,99}$/.test(reference)
    ? reference
    : undefined;
}

const statusTransitions = {
  pending: new Set(["confirmed", "cancelled"]),
  confirmed: new Set(["processing", "cancelled"]),
  processing: new Set(["shipped", "cancelled"]),
  shipped: new Set(["delivered"]),
  delivered: new Set(),
  cancelled: new Set(),
};

export function canTransitionOrder({
  currentStatus,
  nextStatus,
  paymentMethodType,
  paymentStatus,
}) {
  if (!statusTransitions[currentStatus]?.has(nextStatus)) {
    return false;
  }
  if (
    nextStatus === "cancelled" &&
    ["submitted", "verified"].includes(paymentStatus)
  ) {
    return false;
  }

  return !(
    paymentMethodType === "manual" &&
    ["confirmed", "processing", "shipped", "delivered"].includes(nextStatus) &&
    paymentStatus !== "verified"
  );
}
