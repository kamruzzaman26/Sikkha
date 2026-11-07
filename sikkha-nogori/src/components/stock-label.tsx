// Shown only when stock is tracked for the item (true/false); untracked items show nothing.
export function StockLabel({ inStock }: { inStock?: boolean | null }) {
  if (typeof inStock !== "boolean") return null;
  return (
    <p className={`mt-0.5 text-xs font-semibold ${inStock ? "text-emerald-600" : "text-rose-500"}`}>
      {inStock ? "Product in stock" : "Out of stock"}
    </p>
  );
}
