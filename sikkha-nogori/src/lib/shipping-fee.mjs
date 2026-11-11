export const SHIPPING_ZONES = Object.freeze({
  dhaka_city: { label: "ঢাকা সিটি", charge: 48 },
  district_town: { label: "জেলা সদর / পৌরসভা", charge: 52 },
  remote_union: { label: "দূরবর্তী এলাকা / ইউনিয়ন", charge: 57 },
  no_shipping: { label: "ডিজিটাল পণ্য", charge: 0 },
});

export function getShippingCharge(zone) {
  return SHIPPING_ZONES[zone]?.charge;
}

export function isShippingZone(zone) {
  return Object.hasOwn(SHIPPING_ZONES, zone);
}
