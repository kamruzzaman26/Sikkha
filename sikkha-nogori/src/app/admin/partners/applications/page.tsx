import type { Metadata } from "next";
import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/supabase/admin";
import { reviewLibraryApplication } from "./actions";

export const metadata: Metadata = { title: "Partner Applications | Sikkha Nogori", robots: { index: false, follow: false } };

const messages: Record<string,string> = {
  approved: "লাইব্রেরির আবেদন অনুমোদিত হয়েছে।",
  rejected: "লাইব্রেরির আবেদন প্রত্যাখ্যান করা হয়েছে।",
  invalid: "তথ্য যাচাই করে আবার চেষ্টা করুন।",
};

export default async function PartnerApplicationsPage({ searchParams }: { searchParams: Promise<{status?: string}> }) {
  await connection();
  const { supabase } = await requireSuperAdmin();
  const [{ data, error }, params] = await Promise.all([
    supabase.from("library_partners").select("id,library_name,contact_name,email,phone,address,country,business_document_url,status,admin_note,created_at").order("created_at",{ascending:false}).limit(200),
    searchParams,
  ]);
  if (error) throw new Error("লাইব্রেরির আবেদন লোড করা যায়নি।",{cause:error});
  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === "pending").length;
  return <main lang="bn" className="mx-auto min-h-screen max-w-[1500px] bg-[#f3f6f5] px-4 py-6 text-slate-900 sm:px-7 sm:py-8 xl:px-10">
    <header className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">LIBRARY PARTNERSHIP / STEP 01</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Partner Applications</h1>
      <p className="mt-1.5 max-w-3xl text-[15px] leading-6 text-slate-600">নতুন লাইব্রেরির আবেদন যাচাই ও অনুমোদন করুন। অনুমোদন শুধু Super Admin করতে পারবেন।</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm"><span className="rounded-lg bg-amber-50 px-3 py-2 font-bold text-amber-900">Pending: {pending}</span><span className="rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-900">Approved: {rows.filter(r=>r.status==="approved").length}</span><span className="rounded-lg bg-rose-50 px-3 py-2 font-bold text-rose-900">Rejected: {rows.filter(r=>r.status==="rejected").length}</span></div>
    </header>
    {params.status && messages[params.status] && <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{messages[params.status]}</p>}
    <section className="mt-6 space-y-4">
      {rows.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">এখনো কোনো লাইব্রেরি আবেদন জমা পড়েনি।</div> : rows.map((partner) => <article key={partner.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold text-slate-950">{partner.library_name}</h2><p className="mt-1 text-sm text-slate-600">{partner.contact_name} · {partner.country}</p></div><span className={"rounded-full px-3 py-1 text-xs font-bold "+(partner.status==="approved"?"bg-emerald-100 text-emerald-800":partner.status==="rejected"?"bg-rose-100 text-rose-800":"bg-amber-100 text-amber-900")}>{partner.status.toUpperCase()}</span></div>
        <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><p><b>ইমেইল:</b> {partner.email}</p><p><b>ফোন:</b> {partner.phone}</p><p className="sm:col-span-2"><b>ঠিকানা:</b> {partner.address}</p>{partner.business_document_url && <p className="sm:col-span-2"><a className="font-bold text-emerald-800 underline" href={partner.business_document_url} target="_blank" rel="noreferrer">ব্যবসার ডকুমেন্ট দেখুন ↗</a></p>}</div>
        {partner.status === "pending" ? <form action={reviewLibraryApplication} className="mt-5 border-t border-slate-100 pt-4"><input type="hidden" name="partnerId" value={partner.id}/><label className="mb-1 block text-sm font-semibold text-slate-700">Admin note (প্রত্যাখ্যান করলে কারণ লিখুন)</label><textarea name="adminNote" maxLength={1000} rows={2} defaultValue={partner.admin_note ?? ""} className="w-full rounded-lg border border-slate-300 p-3 text-sm"/><div className="mt-3 flex flex-wrap gap-2"><button name="decision" value="approved" className="min-h-11 rounded-lg bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800">Approve Partner</button><button name="decision" value="rejected" className="min-h-11 rounded-lg border border-rose-300 bg-white px-5 font-bold text-rose-700 hover:bg-rose-50">Reject Application</button></div></form> : partner.admin_note && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Admin note: {partner.admin_note}</p>}
      </article>)}
    </section>
  </main>;
}
