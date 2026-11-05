const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True for a plausible email address of at most 254 characters. */
export function isValidEmail(value) {
  return typeof value === "string" && value.length <= 254 && emailPattern.test(value);
}
