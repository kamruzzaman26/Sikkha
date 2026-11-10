import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requirePermission } from "@/lib/supabase/admin";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { createCoupon, deleteCoupon, updateCouponFlag } from "./actions";

export const metadata: Metadata = { title: "Coupons | Sikkha Nogori Admin", robots: { index: false, follow: false } };

type Coupon = {
  id: string; code: string; description: string; discount_percent: number | string;
  starts_at: string | null; expires_at: string | null; min_order_amount: number | string;
  usage_limit: number | null; used_count: number; is_active: boolean; show_publicly: boolean;
};

const messages: Record<string, string> = {
  created: "Coupon created.",
  updated: "Coupon updated.",
  deleted: "Coupon deleted.",
  archived: "This coupon was already used on orders, so it was switched off and hidden instead of deleted (order history stays intact).",
  invalid: "Please check the fields: code 3–20 letters/digits, discount 1–90%, and an expiry date in the future.",
  duplicate: "That coupon code already exists. Choose a different code.",
};

const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600";

function dateText(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function stateOf(c: Coupon, now: number) {
  if (!c.is_active) return { text: "Off", style: "bg-slate-100 text-slate-600" };
  if (c.expires_at && new Date(c.expires_at).getTime() <= now) return { text: "Expired", style: "bg-rose-100 text-rose-700" };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { text: "Scheduled", style: "bg-brand-100 text-brand-800" };
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) return { text: "Used up", style: "bg-amber-100 text-amber-800" };
  return { text: "Live", style: "bg-green-100 text-green-800" };
}

function Toggle({ id, field, value, on, offLabel, onLabel }: { id: string; field: "is_active" | "show_publicly"; value: boolean; on: string; onLabel: string; offLabel: string }) {
  return (
    <form action={updateCouponFlag}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={String(!value)} />
      <button className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${value ? "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
        <span aria-hidden="true" className={`size-2 rounded-full ${value ? "bg-brand-600" : "bg-slate-300"}`} />
        {value ? onLabel : offLabel}
        <span className="sr-only">{on}</span>
      </button>
    </form>
  );
}

export default async function CouponsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { supabase } = await requirePermission("manage_marketing", "/admin/dashboard");
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("Unable to load coupons.", { cause: error });
  const coupons = (data ?? []) as Coupon[];
  // This is a request-time server-render value; the page is dynamic via connection().
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const bad = status === "invalid" || status === "duplicate";

  return (
    <main lang="en" className="mx-auto min-h-screen max-w-[1400px] bg-canvas px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Marketing</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Coupons</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-slate-600">Create percentage-off coupons — with an expiry date for campaigns, or without one for a standing offer. Switch any coupon on or off, and choose whether it is advertised on the checkout page.</p>
      </header>
      {status && messages[status] && <p role="status" aria-live="polite" className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${bad ? "border-rose-200 bg-rose-50 text-rose-900" : "border-brand-200 bg-brand-50 text-brand-900"}`}>{messages[status]}</p>}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-bold">All coupons <span className="text-sm font-semibold text-slate-400">({coupons.length})</span></h2></div>
          {coupons.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-slate-500">No coupons yet. Create your first one on the right.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {coupons.map((c) => {
                const state = stateOf(c, now);
                return (
                  <li key={c.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-lg border border-dashed border-brand-300 bg-brand-50 px-3 py-1.5 font-mono text-base font-extrabold tracking-wider text-brand-900">{c.code}</span>
                        <span className="text-xl font-extrabold">{Number(c.discount_percent)}% <span className="text-sm font-semibold text-slate-500">off</span></span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${state.style}`}>{state.text}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Toggle id={c.id} field="is_active" value={c.is_active} on="Coupon active" onLabel="Active" offLabel="Turned off" />
                        <Toggle id={c.id} field="show_publicly" value={c.show_publicly} on="Shown on checkout" onLabel="Shown on checkout" offLabel="Hidden from checkout" />
                        <form action={deleteCoupon}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmDeleteButton message={`Delete coupon ${c.code}? This cannot be undone.`}>Delete</ConfirmDeleteButton>
                        </form>
                      </div>
                    </div>
                    {c.description && <p className="mt-2 text-sm text-slate-600">{c.description}</p>}
                    <p className="mt-2 text-xs text-slate-500">
                      {c.expires_at ? `Valid ${c.starts_at ? `${dateText(c.starts_at)} → ` : "until "}${dateText(c.expires_at)}` : "No expiry date"}
                      {Number(c.min_order_amount) > 0 && ` · Min order ৳${Number(c.min_order_amount)}`}
                      {` · Used ${c.used_count}${c.usage_limit !== null ? ` of ${c.usage_limit}` : ""} times`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">New coupon</p>
          <h2 className="mt-1 text-xl font-bold">Create a coupon</h2>
          <form action={createCoupon} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={label} htmlFor="code">Code</label><input className={`${input} font-mono uppercase tracking-wider`} id="code" name="code" required pattern="[A-Za-z0-9]{3,20}" maxLength={20} placeholder="EID20" /></div>
              <div><label className={label} htmlFor="percent">Discount (%)</label><input className={input} id="percent" name="percent" type="number" required min={1} max={90} step="0.5" placeholder="10" /></div>
            </div>
            <div><label className={label} htmlFor="description">Note shown to customers (optional)</label><input className={input} id="description" name="description" maxLength={140} placeholder="e.g. Eid special offer" /></div>

            <fieldset className="rounded-xl border border-slate-200 p-4">
              <legend className="px-1 text-xs font-extrabold uppercase tracking-wide text-slate-700">Validity</legend>
              <div className="space-y-2.5">
                <label className="flex items-start gap-3"><input type="radio" name="expiry" value="none" defaultChecked className="mt-1 accent-brand-700" /><span><span className="block text-sm font-bold">No expiry</span><span className="text-xs text-slate-500">Works until you turn it off.</span></span></label>
                <label className="flex items-start gap-3"><input type="radio" name="expiry" value="dates" className="mt-1 accent-brand-700" /><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Limited time</span><span className="text-xs text-slate-500">Set the dates below (Dhaka time).</span></span></label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div><label className={label} htmlFor="startsAt">Starts (optional)</label><input className={input} id="startsAt" name="startsAt" type="datetime-local" /></div>
                <div><label className={label} htmlFor="expiresAt">Ends</label><input className={input} id="expiresAt" name="expiresAt" type="datetime-local" /></div>
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={label} htmlFor="minOrder">Minimum order (৳)</label><input className={input} id="minOrder" name="minOrder" type="number" min={0} step="1" placeholder="0" /></div>
              <div><label className={label} htmlFor="usageLimit">Total uses (optional)</label><input className={input} id="usageLimit" name="usageLimit" type="number" min={1} step="1" placeholder="Unlimited" /></div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" name="showPublicly" className="mt-0.5 size-4 accent-brand-700" /><span><span className="block text-sm font-bold">Show on the checkout page</span><span className="text-xs text-slate-500">Customers can tap it to fill the code. Leave off for a private code you share yourself.</span></span></label>

            <AdminSubmitButton pendingLabel="Creating…" className="min-h-12 w-full rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-brand-700">Create coupon</AdminSubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
