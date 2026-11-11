export type ShippingZone = "dhaka_city" | "district_town" | "remote_union" | "no_shipping";
export const SHIPPING_ZONES: Readonly<Record<ShippingZone, { label: string; charge: number }>>;
export function getShippingCharge(zone: string): number | undefined;
export function isShippingZone(zone: string): zone is ShippingZone;
