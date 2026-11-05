export const CART_STORAGE_KEY = "sikkha-nogori-cart-v1";
export type CartLine = { productId: string; quantity: number };
export function readCart(): CartLine[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CartLine => !!item && typeof item.productId === "string" && /^[0-9a-f-]{36}$/i.test(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0).slice(0, 50);
  } catch { return []; }
}
export function writeCart(items: CartLine[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  window.dispatchEvent(new Event("sikkha-cart-change"));
}
export function addCartItem(productId: string) {
  const items = readCart();
  const found = items.find((item) => item.productId === productId);
  if (found) found.quantity = Math.min(99, found.quantity + 1);
  else items.push({ productId, quantity: 1 });
  writeCart(items);
}
