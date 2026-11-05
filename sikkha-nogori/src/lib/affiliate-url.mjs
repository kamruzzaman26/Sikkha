/**
 * @param {string} value
 * @param {ReadonlySet<string>} allowedHostnames
 * @returns {string | undefined}
 */
export function parseAffiliateUrl(value, allowedHostnames) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  if (!normalizedValue || normalizedValue.length > 2048) {
    return undefined;
  }

  const normalizedHostnames = new Set(
    [...allowedHostnames].map((hostname) => String(hostname).trim().toLowerCase()),
  );

  try {
    const url = new URL(normalizedValue);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !normalizedHostnames.has(hostname)
    ) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}
