"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseCheckoutForm } from "@/lib/order-workflow.mjs";
import { requireCustomer } from "@/lib/supabase/auth";
import { getPublicSiteOrigin } from "@/lib/supabase/env";

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

  const { data: savedOrder, error: savedOrderError } = await supabase
    .from("orders")
    .select("payment_method_type, payment_status, total_amount, currency, customer_name, customer_phone, delivery_address")
    .eq("id", orderId)
    .maybeSingle();

  if (savedOrderError || !savedOrder) {
    throw new Error("Unable to load the newly created order.", { cause: savedOrderError });
  }

  if (savedOrder.payment_method_type === "gateway") {
    if (savedOrder.payment_status === "verified") {
      redirect("/account/orders?status=created");
    }
    const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
    if (!storeId || !storePassword) {
      redirect("/account/orders?status=payment-not-configured");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      redirect("/account/orders?status=gateway-email-required");
    }

    const merchantReference = `SN${randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const { data: transactionRows, error: transactionError } = await supabase.rpc(
      "create_sslcommerz_transaction",
      { p_order_id: orderId, p_merchant_reference: merchantReference },
    );
    const transaction = Array.isArray(transactionRows) ? transactionRows[0] : transactionRows;
    if (
      transactionError ||
      !transaction ||
      typeof transaction.transaction_id !== "string" ||
      typeof transaction.merchant_reference !== "string"
    ) {
      redirect("/account/orders?status=payment-init-failed");
    }

    const sandbox = process.env.SSLCOMMERZ_IS_SANDBOX?.trim().toLowerCase() !== "false";
    const allowedGatewayOrigin = sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
    if (
      transaction.transaction_status === "pending" &&
      typeof transaction.gateway_page_url === "string" &&
      typeof transaction.provider_session_id === "string"
    ) {
      try {
        const existingGatewayUrl = new URL(transaction.gateway_page_url);
        if (existingGatewayUrl.origin === allowedGatewayOrigin) {
          redirect(existingGatewayUrl.toString());
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
      }
    }

    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select("products(product_type)")
      .eq("order_id", orderId);
    if (orderItemsError) {
      throw new Error("Unable to determine the order fulfilment type.", { cause: orderItemsError });
    }
    const needsShipping = (orderItems ?? []).some((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return product?.product_type !== "course";
    });

    const apiUrl = sandbox
      ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
      : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";
    const origin = getPublicSiteOrigin();
    const callbackUrl = `${origin}/api/payments/sslcommerz/return`;
    const ipnUrl = `${origin}/api/payments/sslcommerz/ipn`;
    const requestBody = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: Number(transaction.amount).toFixed(2),
      currency: "BDT",
      tran_id: transaction.merchant_reference,
      success_url: callbackUrl,
      fail_url: callbackUrl,
      cancel_url: callbackUrl,
      ipn_url: ipnUrl,
      cus_name: savedOrder.customer_name,
      cus_email: user.email,
      cus_add1: savedOrder.delivery_address.slice(0, 50),
      cus_city: "Dhaka",
      cus_state: "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: savedOrder.customer_phone,
      shipping_method: needsShipping ? "YES" : "NO",
      product_name: "Sikkha Nogori Order",
      product_category: "Education",
      product_profile: "general",
      value_a: orderId,
      value_b: user.id,
    });

    let gatewayResponse: Record<string, unknown>;
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: requestBody.toString(),
        cache: "no-store",
      });
      gatewayResponse = await response.json() as Record<string, unknown>;
    } catch {
      redirect("/account/orders?status=payment-init-failed");
    }

    const gatewayPageUrl = typeof gatewayResponse.GatewayPageURL === "string"
      ? gatewayResponse.GatewayPageURL
      : "";
    const sessionKey = typeof gatewayResponse.sessionkey === "string"
      ? gatewayResponse.sessionkey
      : "";
    let safeGatewayUrl: URL;
    try {
      safeGatewayUrl = new URL(gatewayPageUrl);
    } catch {
      redirect("/account/orders?status=payment-init-failed");
    }
    if (
      gatewayResponse.status !== "SUCCESS" ||
      !sessionKey ||
      safeGatewayUrl.origin !== allowedGatewayOrigin
    ) {
      redirect("/account/orders?status=payment-init-failed");
    }

    const { error: sessionUpdateError } = await supabase.rpc("update_sslcommerz_session", {
      p_transaction_id: transaction.transaction_id,
      p_provider_session_id: sessionKey,
      p_gateway_page_url: safeGatewayUrl.toString(),
    });
    if (sessionUpdateError) {
      throw new Error("Unable to save the payment session.", { cause: sessionUpdateError });
    }

    redirect(safeGatewayUrl.toString());
  }

  redirect("/account/orders?status=created");
}
