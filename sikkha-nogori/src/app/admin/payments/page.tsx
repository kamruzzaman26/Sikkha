import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/admin";
import {
  savePaymentMethod,
  setPaymentMethodStatus,
} from "./actions";

export const metadata: Metadata = {
  title: "Payment Methods | Sikkha Nogori",
  robots: { index: false, follow: false },
};

const methodTypes = [
  { value: "manual", label: "Manual Payment" },
  { value: "cod", label: "Cash on Delivery (COD)" },
  { value: "gateway", label: "Online Gateway (Not Connected)" },
] as const;

const statusMessages: Record<string, string> = {
  created: "Payment method created.",
  updated: "Payment method updated.",
  enabled: "Payment method enabled for customers.",
  disabled: "Payment method disabled for customers.",
  invalid: "Please verify the information and complete all required fields.",
  "duplicate-code": "This code is already in use.",
  "gateway-unavailable":
    "The online gateway is not connected and cannot be enabled for customers.",
  "not-found": "Payment method not found or no longer editable.",
};

type PaymentMethodFormValue = {
  id?: string;
  name?: string;
  code?: string;
  method_type?: "manual" | "cod" | "gateway";
  description?: string;
  instructions?: string;
  is_enabled?: boolean;
  sort_order?: number;
};

function PaymentMethodForm({
  method,
  idPrefix,
}: {
  method?: PaymentMethodFormValue;
  idPrefix: string;
}) {
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5";

  return (
    <form action={savePaymentMethod} className="grid gap-4">
      {method?.id && <input type="hidden" name="id" value={method.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-name`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Display Name
          </label>
          <input
            id={`${idPrefix}-name`}
            name="name"
            required
            maxLength={100}
            defaultValue={method?.name ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-code`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Unique Code (lowercase English letters)
          </label>
          <input
            id={`${idPrefix}-code`}
            name="code"
            required
            maxLength={64}
            pattern="[a-z0-9]+([_-][a-z0-9]+)*"
            defaultValue={method?.code ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <label
            htmlFor={`${idPrefix}-type`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Payment Type
          </label>
          <select
            id={`${idPrefix}-type`}
            name="methodType"
            required
            defaultValue={method?.method_type ?? "manual"}
            className={inputClass}
          >
            {methodTypes.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-sort`}
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Display Order
          </label>
          <input
            id={`${idPrefix}-sort`}
            name="sortOrder"
            type="number"
            required
            min={0}
            max={99999}
            step={1}
            defaultValue={method?.sort_order ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-description`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Short Description
        </label>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          maxLength={500}
          rows={2}
          defaultValue={method?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-instructions`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Customer Instructions
        </label>
        <textarea
          id={`${idPrefix}-instructions`}
          name="instructions"
          maxLength={3000}
          rows={4}
          defaultValue={method?.instructions ?? ""}
          className={inputClass}
        />
      </div>

      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700">
        <input type="hidden" name="isEnabled" value="false" />
        <input
          type="checkbox"
          name="isEnabled"
          value="true"
          defaultChecked={method?.is_enabled ?? false}
          className="size-4 rounded border-slate-300 text-emerald-700"
        />
        Make this method visible to customers
      </label>

      <button
        type="submit"
        className="w-fit rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
      >
        {method ? "Save Payment Method" : "Add Payment Method"}
      </button>
    </form>
  );
}

async function PaymentMethodsContent({
  searchParams,
}: Pick<PageProps<"/admin/payments">, "searchParams">) {
  await connection();
  const { supabase, role } = await requireAdmin("admin");
  if (role !== "admin") {
    notFound();
  }

  const { data: methods, error } = await supabase
    .from("payment_methods")
    .select(
      "id, name, code, method_type, description, instructions, is_enabled, sort_order, created_at, updated_at",
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Unable to load payment methods.", { cause: error });
  }

  const params = await searchParams;
  const statusValue = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const statusMessage =
    statusValue && Object.hasOwn(statusMessages, statusValue)
      ? statusMessages[statusValue]
      : undefined;

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin" className="font-semibold text-emerald-700">
            ← Admin workspace
          </Link>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Sign out
            </button>
          </form>
        </div>

        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">
            SIKKHA NOGORI · ADMINISTRATION
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Payment Methods
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            নাম, ধরন, নির্দেশনা, Active অবস্থা এবং Display Order পরিচালনা
            করুন। Manual Payment যাচাই না করে Paid হয় না। সাইটে checkout বা
            online payment gateways are not currently enabled.
          </p>
        </header>

        {statusMessage && (
          <p
            role="status"
            className={`mt-6 rounded-xl border px-4 py-3 font-medium ${
              statusValue === "invalid" ||
              statusValue === "duplicate-code" ||
              statusValue === "gateway-unavailable" ||
              statusValue === "not-found"
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            {statusMessage}
          </p>
        )}

        <section className="mt-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold">Add Payment Method</h2>
          <p className="mb-5 mt-2 text-sm leading-6 text-slate-600">
            Add payment methods such as bKash, Nagad, Rocket, Bank Transfer, or COD.
            Names in the list do not mean that a payment gateway is connected.
          </p>
          <PaymentMethodForm idPrefix="new-payment-method" />
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Saved Payment Methods</h2>
              <p className="mt-1 text-sm text-slate-600">
                {methods.length} total · sorted by display order and name
              </p>
            </div>
          </div>

          {methods.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-slate-600">
              এখনো কোনো Add Payment Method করা হয়নি।
            </p>
          ) : (
            <ul className="mt-4 grid gap-4">
              {methods.map((method) => (
                <li
                  key={method.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{method.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {method.code} · Order {method.sort_order} ·{" "}
                        {method.method_type === "manual"
                          ? "Manual"
                          : method.method_type === "cod"
                            ? "COD"
                            : "Gateway"}
                      </p>
                      {method.description && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {method.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        method.is_enabled
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {method.is_enabled ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {method.method_type === "gateway" && (
                    <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
                      No gateway adapter is connected. This method is not shown to customers
                      and cannot accept payments.
                    </p>
                  )}

                  <details className="border-t border-slate-100 pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
                      Edit
                    </summary>
                    <div className="mt-4">
                      <PaymentMethodForm
                        method={method}
                        idPrefix={`payment-method-${method.id}`}
                      />
                    </div>
                  </details>

                  <form action={setPaymentMethodStatus} className="mt-3">
                    <input type="hidden" name="id" value={method.id} />
                    <input
                      type="hidden"
                      name="isEnabled"
                      value={method.is_enabled ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {method.is_enabled ? "Inactive করুন" : "Active করুন"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default async function PaymentMethodsPage({
  searchParams,
}: PageProps<"/admin/payments">) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-5xl animate-pulse rounded-2xl bg-white p-8">
            <div className="h-8 w-72 rounded bg-slate-100" />
            <div className="mt-8 h-48 rounded-xl bg-slate-100" />
            <div className="mt-6 h-56 rounded-xl bg-slate-100" />
          </div>
        </main>
      }
    >
      <PaymentMethodsContent searchParams={searchParams} />
    </Suspense>
  );
}
