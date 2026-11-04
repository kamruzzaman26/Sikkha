"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requireSuperAdmin } from "@/lib/supabase/admin";

function read(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createFinanceEntry(data: FormData) {
  const { supabase } = await requireSuperAdmin();
  const scope = read(data, "scope");
  const entryType = read(data, "entryType");
  const category = read(data, "category");
  const description = read(data, "description");
  const amountText = read(data, "amount");
  const amount = Number(amountText);
  const partnerId = read(data, "partnerId");
  const entryDate = read(data, "entryDate");
  const allowedOwn = ["income", "purchase", "operating_expense", "owner_capital", "refund", "adjustment"];
  const allowedPartner = ["income", "operating_expense", "partner_payable", "partner_payment", "refund", "adjustment"];

  if (
    !["own_business", "partnership"].includes(scope) ||
    !(scope === "own_business" ? allowedOwn : allowedPartner).includes(entryType) ||
    !category || category.length > 100 || !description || description.length > 500 ||
    !Number.isFinite(amount) || amount <= 0 || amount > 999999999999 ||
    (scope === "partnership" && !/^[0-9a-f-]{36}$/i.test(partnerId)) ||
    (scope === "own_business" && partnerId) ||
    (entryDate && !/^\d{4}-\d{2}-\d{2}$/.test(entryDate))
  ) redirect("/admin/accounts-finance?status=invalid");

  const { data: { user } } = await supabase.auth.getUser();
  const { data: inserted, error } = await supabase.from("finance_entries").insert({
    scope,
    entry_type: entryType,
    category,
    description,
    amount: amount.toFixed(2),
    counterparty: read(data, "counterparty") || null,
    partner_id: scope === "partnership" ? partnerId : null,
    order_id: read(data, "orderId") || null,
    payment_method: read(data, "paymentMethod") || null,
    reference_no: read(data, "referenceNo") || null,
    notes: read(data, "notes") || null,
    entry_date: entryDate || undefined,
    created_by: user?.id ?? null,
  }).select("id").single();

  if (error || !inserted) {
    console.error("Finance ledger insert failed", error);
    redirect("/admin/accounts-finance?status=save_error");
  }
  await logActivity(supabase, "finance_entry_created", "finance_entry", inserted.id, {
    scope, entryType, amount: amount.toFixed(2),
  });
  revalidatePath("/admin/accounts-finance");
  redirect("/admin/accounts-finance?status=saved");
}
