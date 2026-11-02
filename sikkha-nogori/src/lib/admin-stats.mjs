// Pure helpers for dashboard numbers. All inputs come from the database.
const dhakaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dhakaDateKey(value) {
  return dhakaDay.format(new Date(value));
}

export function summarizeOrders(orders, now = new Date()) {
  const today = dhakaDateKey(now);
  const month = today.slice(0, 7);
  const stats = {
    totalOrders: orders.length,
    pending: 0,
    completed: 0,
    cancelled: 0,
    totalSales: 0,
    todaySales: 0,
    monthSales: 0,
  };

  for (const order of orders) {
    if (order.status === "pending") stats.pending += 1;
    if (order.status === "delivered") stats.completed += 1;
    if (order.status === "cancelled") stats.cancelled += 1;

    // Sales count only orders whose payment was verified by an admin.
    if (order.payment_status === "verified") {
      const amount = Number(order.total_amount) || 0;
      const key = dhakaDateKey(order.created_at);
      stats.totalSales += amount;
      if (key === today) stats.todaySales += amount;
      if (key.startsWith(month)) stats.monthSales += amount;
    }
  }

  return stats;
}

export function bestSellers(items, limit = 5) {
  const totals = new Map();
  for (const item of items) {
    const current = totals.get(item.product_title) ?? 0;
    totals.set(item.product_title, current + (Number(item.quantity) || 0));
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([title, quantity]) => ({ title, quantity }));
}
