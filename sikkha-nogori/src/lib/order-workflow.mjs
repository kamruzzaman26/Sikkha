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
  const streetAddress = value("deliveryAddress");
  const division = value("division");
  const district = value("district");
  const thana = value("thana");
  const union = value("union");
  const area = value("area");
  const deliveryInstructions = value("deliveryInstructions");
  const hasStructuredAddress = [division, district, thana, area].some(Boolean);
  const deliveryAddress = hasStructuredAddress
    ? [
        division && `বিভাগ: ${division}`,
        district && `জেলা: ${district}`,
        thana && `উপজেলা/থানা: ${thana}`,
        union && `ইউনিয়ন: ${union}`,
        area && `এলাকা: ${area}`,
        streetAddress && `বিস্তারিত ঠিকানা: ${streetAddress}`,
        deliveryInstructions && `ডেলিভারি নির্দেশনা: ${deliveryInstructions}`,
      ].filter(Boolean).join(", ")
    : streetAddress;
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
    (hasStructuredAddress && (
      division.length < 2 || division.length > 40 ||
      district.length < 2 || district.length > 80 ||
      thana.length < 2 || thana.length > 80 ||
      union.length > 80 ||
      area.length < 2 || area.length > 120 ||
      streetAddress.length < 5 || streetAddress.length > 700 ||
      deliveryInstructions.length > 200
    )) ||
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
