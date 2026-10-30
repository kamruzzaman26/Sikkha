const methodTypes = new Set(["manual", "cod", "gateway"]);
const codePattern = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

/**
 * @param {FormData} formData
 * @returns {{
 *   name: string;
 *   code: string;
 *   method_type: "manual" | "cod" | "gateway";
 *   description: string;
 *   instructions: string;
 *   is_enabled: boolean;
 *   sort_order: number;
 *   configuration: Record<string, never>;
 * } | undefined}
 */
export function parsePaymentMethodForm(formData) {
  const getValue = (name) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  };

  const name = getValue("name");
  const code = getValue("code");
  const methodType = getValue("methodType");
  const description = getValue("description");
  const instructions = getValue("instructions");
  const isEnabledValues = formData
    .getAll("isEnabled")
    .map((value) => (typeof value === "string" ? value.trim() : ""));
  if (
    isEnabledValues.length === 0 ||
    isEnabledValues.some((value) => value !== "true" && value !== "false")
  ) {
    return undefined;
  }
  const isEnabledValue = isEnabledValues.includes("true") ? "true" : "false";
  const sortOrderValue = getValue("sortOrder");

  if (
    !name ||
    name.length > 100 ||
    !codePattern.test(code) ||
    code.length > 64 ||
    !methodTypes.has(methodType) ||
    description.length > 500 ||
    instructions.length > 3000 ||
    !/^(0|[1-9]\d{0,4})$/.test(sortOrderValue)
  ) {
    return undefined;
  }

  const isEnabled = isEnabledValue === "true";
  if (methodType === "gateway" && isEnabled) {
    return undefined;
  }

  return {
    name,
    code,
    method_type: /** @type {"manual" | "cod" | "gateway"} */ (methodType),
    description,
    instructions,
    is_enabled: isEnabled,
    sort_order: Number(sortOrderValue),
    configuration: {},
  };
}

/**
 * @param {{ is_enabled: boolean; method_type: string }} method
 */
export function isCustomerVisiblePaymentMethod(method) {
  return method.is_enabled && method.method_type !== "gateway";
}
