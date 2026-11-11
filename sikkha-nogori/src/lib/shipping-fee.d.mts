export type ShippingZone = "dhaka_city" | "district_town" | "remote_union" | "no_shipping";
export type ShippingCharges = Readonly<Record<ShippingZone, number>>;
export const DEFAULT_SHIPPING_CHARGES: ShippingCharges;
export function getShippingCharges(value?: unknown): ShippingCharges;
export function getShippingCharge(zone: string, charges?: unknown): number | undefined;
export function isShippingZone(zone: string): zone is ShippingZone;
