export function formatBDT(amount: number | string): string {
  return `৳${new Intl.NumberFormat("bn-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount))}`;
}
