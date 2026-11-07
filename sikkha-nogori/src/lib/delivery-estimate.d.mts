export const DEFAULT_DELIVERY_DAYS: number;
export const MAX_DELIVERY_DAYS: number;
export function normalizeDeliveryDays(value: unknown): number;
export function estimateDeliveryDate(now: Date, days: number): Date;
export function formatDeliveryDate(date: Date, locale?: string): string;
export const DEFAULT_DHAKA_DAYS: number;
export const DEFAULT_OUTSIDE_DAYS: number;
export function normalizeZoneDays(value: unknown, fallback: number): number;
export function describeDeliveryDay(now: Date, days: number): string;
