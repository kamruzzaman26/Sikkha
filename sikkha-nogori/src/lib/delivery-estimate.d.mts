export const DEFAULT_DELIVERY_DAYS: number;
export const MAX_DELIVERY_DAYS: number;
export function normalizeDeliveryDays(value: unknown): number;
export function estimateDeliveryDate(now: Date, days: number): Date;
export function formatDeliveryDate(date: Date): string;
