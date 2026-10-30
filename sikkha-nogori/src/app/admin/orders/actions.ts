"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

const orderStatuses = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
const paymentDecisions = ["verified", "rejected"] as const;

function getFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function finishAction(status: string): never {
  revalidatePath("/admin/orders");
  revalidatePath("/account/orders");
  redirect(`/admin/orders?status=${status}`);
}

function handleRpcError(
  error: { code?: string; message: string },
): never | undefined {
  if (error.code === "42501") {
    redirect("/admin/orders?status=forbidden");
  }
  if (error.code === "P0002") {
    redirect("/admin/orders?status=not-found");
  }
  if (error.code === "23514") {
    redirect("/admin/orders?status=invalid-transition");
  }

  throw new Error("Unable to update the order.", { cause: error });
}

export async function updateOrderStatus(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const orderId = getFormValue(formData, "orderId");
  const nextStatus = getFormValue(formData, "nextStatus");

  if (
    !isUuid(orderId) ||
    !orderStatuses.some((status) => status === nextStatus)
  ) {
    redirect("/admin/orders?status=invalid");
  }

  const { error } = await supabase.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_next_status: nextStatus,
  });
  if (error) {
    handleRpcError(error);
  }

  finishAction("order-updated");
}

export async function reviewOrderPayment(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const orderId = getFormValue(formData, "orderId");
  const decision = getFormValue(formData, "decision");
  const rejectionReason = getFormValue(formData, "rejectionReason");

  if (
    !isUuid(orderId) ||
    !paymentDecisions.some((value) => value === decision) ||
    rejectionReason.length > 500 ||
    (decision === "rejected" && !rejectionReason)
  ) {
    redirect("/admin/orders?status=invalid");
  }

  const { error } = await supabase.rpc("review_order_payment", {
    p_order_id: orderId,
    p_decision: decision,
    p_rejection_reason: rejectionReason || null,
  });
  if (error) {
    handleRpcError(error);
  }

  finishAction(
    decision === "verified" ? "payment-verified" : "payment-rejected",
  );
}

export async function recordOrderRefund(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const orderId = getFormValue(formData, "orderId");
  const reason = getFormValue(formData, "reason");

  if (!isUuid(orderId) || reason.length < 3 || reason.length > 500) {
    redirect("/admin/orders?status=invalid");
  }

  const { error } = await supabase.rpc("admin_record_order_refund", {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) {
    handleRpcError(error);
  }

  finishAction("refund-recorded");
}
