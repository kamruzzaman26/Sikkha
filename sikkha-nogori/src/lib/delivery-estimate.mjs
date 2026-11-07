// Estimated delivery date: today (Asia/Dhaka) counts as day 1, so with 7 days
// on the 6th the estimate is the 12th. Bangladesh has no DST (fixed UTC+6).
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_DELIVERY_DAYS = 7;
export const MAX_DELIVERY_DAYS = 60;

/** Returns a valid whole number of days, 0 to hide, or the default when unset/invalid. */
export function normalizeDeliveryDays(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_DELIVERY_DAYS;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > MAX_DELIVERY_DAYS) return DEFAULT_DELIVERY_DAYS;
  return days;
}

/** Date at 00:00 Dhaka (as a UTC-based Date) of the estimated delivery. */
export function estimateDeliveryDate(now, days) {
  const dhakaNow = new Date(now.getTime() + DHAKA_OFFSET_MS);
  const dhakaMidnight = Date.UTC(dhakaNow.getUTCFullYear(), dhakaNow.getUTCMonth(), dhakaNow.getUTCDate());
  return new Date(dhakaMidnight + (days - 1) * DAY_MS);
}

/** e.g. "১২ নভেম্বর, বৃহস্পতিবার" */
export function formatDeliveryDate(date, locale = "bn-BD") {
  const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "long", timeZone: "UTC" });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.day} ${parts.month}, ${parts.weekday}`;
}
