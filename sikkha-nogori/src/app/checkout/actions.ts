"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseCheckoutForm } from "@/lib/order-workflow.mjs";
import { requireCustomer } from "@/lib/supabase/auth";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

// Back to step 2 with the same selection, so a failed order never loses the cart.
function deliveryUrl(formData: FormData, status: string): string {
  const q = new URLSearchParams();
  for (const entry of formData.getAll("productId")) {
    if (typeof entry !== "string" || !isUuid(entry)) continue;
    q.append("productId", entry);
    const qty = formData.get(`quantity-${entry}`);
    if (typeof qty === "string" && /^[1-9]\d?$/.test(qty.trim())) q.set(`quantity-${entry}`, qty.trim());
  }
  const coupon = formData.get("couponCode");
  if (typeof coupon === "string" && /^[A-Za-z0-9]{1,20}$/.test(coupon.trim())) q.set("couponCode", coupon.trim());
  q.set("status", status);
  return `/checkout/delivery?${q}`;
}

export async function placeOrder(formData: FormData) {
  const { supabase } = await requireCustomer();

  const order = parseCheckoutForm(formData);
  if (!order) {
    redirect(deliveryUrl(formData, "invalid"));
  }

  const referralCode = (await cookies()).get("sikkha_referral")?.value;
  const validReferralCode =
    referralCode && /^[A-Z0-9]{1,32}$/i.test(referralCode)
      ? referralCode
      : null;
  const rawCoupon = formData.get("couponCode");
  const couponCode =
    typeof rawCoupon === "string" && rawCoupon.trim()
      ? rawCoupon.trim().toUpperCase().slice(0, 40)
      : null;
  const { data: orderId, error } = await supabase.rpc("place_order_with_coupon", {
    p_idempotency_key: order.idempotencyKey,
    p_customer_name: order.customerName,
    p_customer_phone: order.customerPhone,
    p_delivery_address: order.deliveryAddress,
    p_payment_method_id: order.paymentMethodId,
    p_items: order.items,
    p_referral_code: validReferralCode,
    p_coupon_code: couponCode,
  });

  if (error) {
    // 22023 = the coupon was refused; the whole order is rolled back.
    if (error.code === "22023" && /^coupon_[a-z_]+$/.test(error.message)) {
      redirect(deliveryUrl(formData, error.message.replaceAll("_", "-")));
    }
    if (error.code === "23505") {
      redirect("/account/orders?status=created");
    }
    if (["23514", "P0002"].includes(error.code ?? "")) {
      redirect(deliveryUrl(formData, "unavailable"));
    }
    throw new Error("Unable to place the order.", { cause: error });
  }
  if (typeof orderId !== "string" || !isUuid(orderId)) {
    throw new Error("Order placement returned an invalid order identifier.");
  }

  redirect("/account/orders?status=created");
}
