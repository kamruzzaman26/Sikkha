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

export async function placeOrder(formData: FormData) {
  const { supabase } = await requireCustomer();

  const order = parseCheckoutForm(formData);
  if (!order) {
    redirect("/checkout?status=invalid");
  }

  const referralCode = (await cookies()).get("sikkha_referral")?.value;
  const validReferralCode =
    referralCode && /^[A-Z0-9]{1,32}$/i.test(referralCode)
      ? referralCode
      : null;
  const { data: orderId, error } = await supabase.rpc("place_order_with_referral", {
    p_idempotency_key: order.idempotencyKey,
    p_customer_name: order.customerName,
    p_customer_phone: order.customerPhone,
    p_delivery_address: order.deliveryAddress,
    p_payment_method_id: order.paymentMethodId,
    p_items: order.items,
    p_referral_code: validReferralCode,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/checkout?status=duplicate");
    }
    if (["23514", "P0002"].includes(error.code ?? "")) {
      redirect("/checkout?status=unavailable");
    }
    throw new Error("Unable to place the order.", { cause: error });
  }
  if (typeof orderId !== "string" || !isUuid(orderId)) {
    throw new Error("Order placement returned an invalid order identifier.");
  }

  redirect("/account/orders?status=created");
}
