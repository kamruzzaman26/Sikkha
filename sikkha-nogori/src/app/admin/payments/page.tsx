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
  title: "পেমেন্ট মেথড ব্যবস্থাপনা | শিক্ষা নগরী",
  robots: { index: false, follow: false },
};

const methodTypes = [
  { value: "manual", label: "ম্যানুয়াল পেমেন্ট" },
  { value: "cod", label: "ক্যাশ অন ডেলিভারি (COD)" },
  { value: "gateway", label: "অনলাইন গেটওয়ে (এখনো সংযুক্ত নয়)" },
] as const;

const statusMessages: Record<string, string> = {
  created: "পেমেন্ট মেথড যোগ করা হয়েছে।",
  updated: "পেমেন্ট মেথড হালনাগাদ করা হয়েছে।",
  enabled: "পেমেন্ট মেথড গ্রাহকের জন্য চালু করা হয়েছে।",
  disabled: "পেমেন্ট মেথড গ্রাহকের জন্য বন্ধ করা হয়েছে।",
  invalid: "তথ্য যাচাই করুন এবং সব ঘর সঠিকভাবে পূরণ করুন।",
  "duplicate-code": "এই code-টি আগে থেকেই ব্যবহৃত হয়েছে।",
  "gateway-unavailable":
    "অনলাইন গেটওয়ে এখনো সংযুক্ত নয়; এটি গ্রাহকের জন্য চালু করা যাবে না।",
  "not-found": "পেমেন্ট মেথডটি পাওয়া যায়নি বা আর সম্পাদনাযোগ্য নয়।",
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
            প্রদর্শিত নাম
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
            ইউনিক code (ইংরেজি ছোট অক্ষর)
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
            পেমেন্টের ধরন
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
            প্রদর্শনের ক্রম
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
          সংক্ষিপ্ত বিবরণ
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
          গ্রাহকের জন্য নির্দেশনা
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
        গ্রাহকের সামনে প্রদর্শন চালু করুন
      </label>

      <button
        type="submit"
        className="w-fit rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
      >
        {method ? "পেমেন্ট মেথড সংরক্ষণ" : "পেমেন্ট মেথড যোগ"}
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
            ← প্রশাসনিক প্যানেল
          </Link>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              লগআউট
            </button>
          </form>
        </div>

        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">
            শিক্ষা নগরী · প্রশাসন
          </p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            পেমেন্ট মেথড ব্যবস্থাপনা
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            নাম, ধরন, নির্দেশনা, সক্রিয় অবস্থা এবং প্রদর্শনের ক্রম পরিচালনা
            করুন। ম্যানুয়াল পেমেন্ট যাচাই না করে Paid হয় না। সাইটে checkout বা
            অনলাইন payment gateway এখনো চালু নেই।
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
          <h2 className="text-xl font-bold">নতুন পেমেন্ট মেথড</h2>
          <p className="mb-5 mt-2 text-sm leading-6 text-slate-600">
            bKash, Nagad, Rocket, Bank Transfer বা COD-এর মতো মেথড নিজে যোগ
            করুন। তালিকার নামগুলো কোনো চালু পেমেন্টের নিশ্চয়তা নয়।
          </p>
          <PaymentMethodForm idPrefix="new-payment-method" />
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">সংরক্ষিত পেমেন্ট মেথড</h2>
              <p className="mt-1 text-sm text-slate-600">
                মোট {methods.length}টি · ক্রম ও নাম অনুযায়ী সাজানো
              </p>
            </div>
          </div>

          {methods.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-slate-600">
              এখনো কোনো পেমেন্ট মেথড যোগ করা হয়নি।
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
                        {method.code} · ক্রম {method.sort_order} ·{" "}
                        {method.method_type === "manual"
                          ? "ম্যানুয়াল"
                          : method.method_type === "cod"
                            ? "COD"
                            : "গেটওয়ে"}
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
                      {method.is_enabled ? "সক্রিয়" : "নিষ্ক্রিয়"}
                    </span>
                  </div>

                  {method.method_type === "gateway" && (
                    <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
                      কোনো gateway adapter সংযুক্ত নয়। এই মেথড গ্রাহককে দেখানো
                      বা পেমেন্ট নেওয়ার জন্য উপলভ্য নয়।
                    </p>
                  )}

                  <details className="border-t border-slate-100 pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-emerald-800">
                      সম্পাদনা
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
                      {method.is_enabled ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
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
