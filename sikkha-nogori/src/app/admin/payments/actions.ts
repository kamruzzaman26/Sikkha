"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parsePaymentMethodForm } from "@/lib/payment-methods.mjs";
import { requireAdmin } from "@/lib/supabase/admin";

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
  revalidatePath("/admin/payments");
  redirect(`/admin/payments?status=${status}`);
}

export async function savePaymentMethod(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const id = getFormValue(formData, "id");
  if (
    getFormValue(formData, "methodType") === "gateway" &&
    formData
      .getAll("isEnabled")
      .some((value) => (typeof value === "string" ? value.trim() : "") === "true")
  ) {
    redirect("/admin/payments?status=gateway-unavailable");
  }
  const values = parsePaymentMethodForm(formData);

  if ((id && !isUuid(id)) || !values) {
    redirect("/admin/payments?status=invalid");
  }

  if (id) {
    const { data, error } = await supabase
      .from("payment_methods")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error?.code === "23505") {
      redirect("/admin/payments?status=duplicate-code");
    }
    if (error) {
      throw new Error("Unable to update the payment method.", { cause: error });
    }
    if (!data) {
      redirect("/admin/payments?status=not-found");
    }

    finishAction("updated");
  }

  const { error } = await supabase.from("payment_methods").insert(values);

  if (error?.code === "23505") {
    redirect("/admin/payments?status=duplicate-code");
  }
  if (error) {
    throw new Error("Unable to add the payment method.", { cause: error });
  }

  finishAction("created");
}

export async function setPaymentMethodStatus(formData: FormData) {
  const { supabase } = await requireAdmin("admin");
  const id = getFormValue(formData, "id");
  const isEnabledValue = getFormValue(formData, "isEnabled");

  if (!isUuid(id) || !["true", "false"].includes(isEnabledValue)) {
    redirect("/admin/payments?status=invalid");
  }

  if (isEnabledValue === "true") {
    const { data: method, error: methodError } = await supabase
      .from("payment_methods")
      .select("method_type")
      .eq("id", id)
      .maybeSingle();

    if (methodError) {
      throw new Error("Unable to verify the payment method.", {
        cause: methodError,
      });
    }
    if (!method) {
      redirect("/admin/payments?status=not-found");
    }
    if (method.method_type === "gateway") {
      redirect("/admin/payments?status=gateway-unavailable");
    }
  }

  const { data, error } = await supabase
    .from("payment_methods")
    .update({
      is_enabled: isEnabledValue === "true",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to change the payment method status.", {
      cause: error,
    });
  }
  if (!data) {
    redirect("/admin/payments?status=not-found");
  }

  finishAction(isEnabledValue === "true" ? "enabled" : "disabled");
}
