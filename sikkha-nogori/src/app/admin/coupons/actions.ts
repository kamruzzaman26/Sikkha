"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requirePermission } from "@/lib/supabase/admin";

const BASE = "/admin/coupons";

function text(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// Dhaka is UTC+6 all year; datetime-local values carry no zone.
function dhakaDate(value: string): string | null | undefined {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}:00+06:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function createCoupon(form: FormData) {
  const { supabase } = await requirePermission("manage_marketing", "/admin/dashboard");
  const code = text(form, "code").toUpperCase();
  const percent = Number(text(form, "percent"));
  const description = text(form, "description");
  const minOrder = text(form, "minOrder") === "" ? 0 : Number(text(form, "minOrder"));
  const limitRaw = text(form, "usageLimit");
  const usageLimit = limitRaw === "" ? null : Number(limitRaw);
  const noExpiry = text(form, "expiry") === "none";
  const startsAt = noExpiry ? null : dhakaDate(text(form, "startsAt"));
  const expiresAt = noExpiry ? null : dhakaDate(text(form, "expiresAt"));

  if (
    !/^[A-Z0-9]{3,20}$/.test(code) ||
    !(percent > 0 && percent <= 90) ||
    description.length > 140 ||
    !(minOrder >= 0 && minOrder <= 10_000_000) ||
    (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1 || usageLimit > 1_000_000)) ||
    startsAt === undefined || expiresAt === undefined ||
    (!noExpiry && !expiresAt) ||
    (startsAt && expiresAt && expiresAt <= startsAt) ||
    (expiresAt && new Date(expiresAt) <= new Date())
  ) {
    redirect(`${BASE}?status=invalid`);
  }

  const { error } = await supabase.from("coupons").insert({
    code, description, discount_percent: Math.round(percent * 100) / 100, min_order_amount: minOrder,
    usage_limit: usageLimit, starts_at: startsAt, expires_at: expiresAt,
    is_active: true, show_publicly: text(form, "showPublicly") === "on",
  });
  if (error) {
    if (error.code === "23505") redirect(`${BASE}?status=duplicate`);
    throw new Error("Unable to create the coupon.", { cause: error });
  }
  await logActivity(supabase, "coupon_created", "coupons", code);
  revalidatePath(BASE);
  revalidatePath("/checkout");
  redirect(`${BASE}?status=created`);
}

export async function updateCouponFlag(form: FormData) {
  const { supabase } = await requirePermission("manage_marketing", "/admin/dashboard");
  const id = text(form, "id");
  const field = text(form, "field");
  const value = text(form, "value") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["is_active", "show_publicly"].includes(field)) {
    redirect(`${BASE}?status=invalid`);
  }
  const { error } = await supabase.from("coupons").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Unable to update the coupon.", { cause: error });
  await logActivity(supabase, "coupon_updated", "coupons", id);
  revalidatePath(BASE);
  revalidatePath("/checkout");
  redirect(`${BASE}?status=updated`);
}

export async function deleteCoupon(form: FormData) {
  const { supabase } = await requirePermission("manage_marketing", "/admin/dashboard");
  const id = text(form, "id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect(`${BASE}?status=invalid`);
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) {
    // Already used on an order: keep the history, just switch it off and hide it.
    if (error.code === "23503") {
      await supabase.from("coupons").update({ is_active: false, show_publicly: false, updated_at: new Date().toISOString() }).eq("id", id);
      await logActivity(supabase, "coupon_archived", "coupons", id);
      revalidatePath(BASE);
      revalidatePath("/checkout");
      redirect(`${BASE}?status=archived`);
    }
    throw new Error("Unable to delete the coupon.", { cause: error });
  }
  await logActivity(supabase, "coupon_deleted", "coupons", id);
  revalidatePath(BASE);
  revalidatePath("/checkout");
  redirect(`${BASE}?status=deleted`);
}
