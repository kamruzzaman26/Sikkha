import { isIP } from "node:net";

/**
 * @param {string} value
 * @returns {string | undefined}
 */
export function parseProductImageUrl(value) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  if (!normalizedValue || normalizedValue.length > 2048) {
    return undefined;
  }

  try {
    const url = new URL(normalizedValue);
    const hostname = url.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !hostname.includes(".") ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      isIP(hostname) !== 0
    ) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}
