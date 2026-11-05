"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseTransactionReference } from "@/lib/order-workflow.mjs";
import { requireCustomer } from "@/lib/supabase/auth";

function getFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function submitManualPayment(formData: FormData) {
  const { supabase } = await requireCustomer();

  const orderId = getFormValue(formData, "orderId");
  const transactionReference = parseTransactionReference(
    getFormValue(formData, "transactionReference"),
  );
  if (!isUuid(orderId) || !transactionReference) {
    redirect("/account/orders?status=invalid-reference");
  }

  const { error } = await supabase.rpc("submit_manual_payment", {
    p_order_id: orderId,
    p_transaction_reference: transactionReference,
  });

  if (error) {
    if (["23514", "P0002"].includes(error.code ?? "")) {
      redirect("/account/orders?status=payment-unavailable");
    }
    if (error.code === "23505") {
      redirect("/account/orders?status=duplicate-reference");
    }
    throw new Error("Unable to submit the manual payment reference.", {
      cause: error,
    });
  }

  revalidatePath("/account/orders");
  redirect("/account/orders?status=reference-submitted");
}
