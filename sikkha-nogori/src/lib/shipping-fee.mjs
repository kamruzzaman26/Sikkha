export const DEFAULT_SHIPPING_CHARGES = Object.freeze({
  dhaka_city: 48,
  district_town: 52,
  remote_union: 57,
  no_shipping: 0,
});

export function getShippingCharges(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.freeze({
    dhaka_city: validCharge(source.dhaka_city, DEFAULT_SHIPPING_CHARGES.dhaka_city),
    district_town: validCharge(source.district_town, DEFAULT_SHIPPING_CHARGES.district_town),
    remote_union: validCharge(source.remote_union, DEFAULT_SHIPPING_CHARGES.remote_union),
    no_shipping: 0,
  });
}

function validCharge(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 10000
    ? Math.round(number * 100) / 100
    : fallback;
}

export function getShippingCharge(zone, charges = DEFAULT_SHIPPING_CHARGES) {
  return Object.hasOwn(DEFAULT_SHIPPING_CHARGES, zone)
    ? (zone === "no_shipping" ? 0 : getShippingCharges(charges)[zone])
    : undefined;
}

export function isShippingZone(zone) {
  return Object.hasOwn(DEFAULT_SHIPPING_CHARGES, zone);
}
