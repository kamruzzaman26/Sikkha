// Helpers for the hierarchical product category taxonomy.
// rows: { id, parent_id, name, sort_order }, links: { category_id, product_id }

function childrenByParent(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.parent_id) {
      map.set(row.parent_id, [...(map.get(row.parent_id) ?? []), row]);
    }
  }
  return map;
}

/** Ids of every category called `name`, plus all of their descendants. */
export function collectCategoryIds(rows, name) {
  const children = childrenByParent(rows);
  const stack = rows.filter((row) => row.name === name).map((row) => row.id);
  const ids = new Set();
  while (stack.length > 0) {
    const id = stack.pop();
    if (ids.has(id)) continue;
    ids.add(id);
    for (const child of children.get(id) ?? []) {
      stack.push(child.id);
    }
  }
  return [...ids];
}

/**
 * Top-level categories that contain at least one product, counting the
 * products of all their descendants once. Most populated first.
 */
export function rootCategoryCounts(rows, links) {
  const children = childrenByParent(rows);
  const productsByCategory = new Map();
  for (const link of links) {
    const set = productsByCategory.get(link.category_id) ?? new Set();
    set.add(link.product_id);
    productsByCategory.set(link.category_id, set);
  }

  const result = [];
  for (const root of rows.filter((row) => !row.parent_id)) {
    const products = new Set();
    const seen = new Set();
    const stack = [root.id];
    while (stack.length > 0) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const productId of productsByCategory.get(id) ?? []) {
        products.add(productId);
      }
      for (const child of children.get(id) ?? []) {
        stack.push(child.id);
      }
    }
    if (products.size > 0) {
      result.push({
        name: root.name,
        count: products.size,
        sortOrder: root.sort_order ?? 0,
      });
    }
  }

  return result
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name, "bn"),
    )
    .map(({ name, count }) => ({ name, count }));
}
