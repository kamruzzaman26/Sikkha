"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requirePermission } from "@/lib/supabase/admin";

const BASE = "/admin/inventory";
const read = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export async function saveInventory(formData: FormData) {
  const { supabase } = await requirePermission("manage_products", "/admin/dashboard");
  const productId = read(formData, "productId");
  const sku = read(formData, "sku");
  const quantity = Number(read(formData, "quantity"));
  const threshold = Number(read(formData, "threshold"));
  if (!/^[0-9a-f-]{36}$/i.test(productId) || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100000000 || !Number.isSafeInteger(threshold) || threshold < 0 || threshold > 100000000 || sku.length > 80) {
    redirect(`${BASE}?status=invalid`);
  }

  const { data: product, error: productError } = await supabase.from("products").select("id,title").eq("id", productId).maybeSingle();
  if (productError) throw new Error("Unable to verify product.", { cause: productError });
  if (!product) redirect(`${BASE}?status=not-found`);

  const { data: previousStock, error: previousError } = await supabase
    .from("product_inventory")
    .select("stock_quantity")
    .eq("product_id", productId)
    .maybeSingle();
  if (previousError) throw new Error("Unable to read current stock.", { cause: previousError });

  const previousQuantity = previousStock?.stock_quantity ?? 0;
  const change = quantity - previousQuantity;
  const { error } = await supabase.from("product_inventory").upsert({
    product_id: productId,
    sku: sku || null,
    stock_quantity: quantity,
    low_stock_threshold: threshold,
    updated_at: new Date().toISOString(),
  }, { onConflict: "product_id" });
  if (error) {
    if (error.code === "23505") redirect(`${BASE}?status=sku-exists`);
    throw new Error("Unable to save inventory.", { cause: error });
  }

  if (change !== 0) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: movementError } = await supabase.from("inventory_movements").insert({
      product_id: productId,
      movement_type: previousStock ? "adjustment" : "opening",
      quantity_change: change,
      quantity_before: previousQuantity,
      quantity_after: quantity,
      note: previousStock ? "Admin stock adjustment" : "Opening stock",
      created_by: user?.id ?? null,
    });
    if (movementError) throw new Error("Stock saved, but movement history could not be recorded.", { cause: movementError });
  }

  await logActivity(supabase, "inventory_updated", "product", productId, { title: product.title, previousQuantity, quantity, sku });
  revalidatePath(BASE);
  revalidatePath("/admin");
  revalidatePath("/products");
  redirect(`${BASE}?status=saved`);
}
