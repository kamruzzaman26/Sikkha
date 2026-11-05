import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/supabase/admin";
import { reviewLibraryApplication } from "../actions";

export const metadata: Metadata = { title: "Library Partnership | Sikkha Nogori Admin", robots: { index: false, follow: false } };

const sections = [
  ["applications", "Partner Applications", "লাইব্রেরির আবেদন যাচাই ও অনুমোদন"],
  ["books", "Partner Books & Stock", "পার্টনার লাইব্রেরির বই, সংস্করণ ও স্টক"],
  ["assignments", "Order Assignment", "অর্ডার নির্দিষ্ট লাইব্রেরিতে বরাদ্দ"],
  ["delivery", "Packing & Delivery", "প্যাকিং, কুরিয়ার ও ট্র্যাকিং"],
  ["commissions", "Commission & Settlement", "কমিশন হিসাব ও পেমেন্ট নিষ্পত্তি"],
] as const;

type Section = (typeof sections)[number][0];
const money = (value: number | string) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;

export default async function LibraryPartnershipPage({ params, searchParams }: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await connection();
  const { supabase } = await requireSuperAdmin();
  const { section: rawSection } = await params;
  const section = sections.some(([key]) => key === rawSection) ? rawSection as Section : "applications";
  const active = sections.find(([key]) => key === section)!;
  const query = await searchParams;
  const status = Array.isArray(query.status) ? query.status[0] : query.status;
  const messages: Record<string,string> = {
    reviewed: "আবেদনের সিদ্ধান্ত সংরক্ষণ হয়েছে।",
    invalid: "আবেদনের তথ্য সঠিক নয়।",
    "not-pending": "এই আবেদনটি আর Pending অবস্থায় নেই।",
    error: "আবেদন আপডেট করা যায়নি। আবার চেষ্টা করুন।",
  };

  let content;
  if (section === "applications") {
    const { data, error } = await supabase.from("library_partners").select("id,library_name,contact_name,email,phone,address,country,business_document_url,status,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error("লাইব্রেরির আবেদন লোড করা যায়নি।", { cause: error });
    content = (data ?? []).length ? <div className="space-y-4">{data!.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold">{item.library_name}</h2><p className="mt-1 text-sm text-slate-600">{item.contact_name} · {item.email} · {item.phone}</p><p className="mt-1 text-sm text-slate-500">{item.address}, {item.country}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold capitalize text-amber-800">{item.status}</span></div>{item.business_document_url && <a className="mt-3 inline-block text-sm font-bold text-emerald-800 underline" href={item.business_document_url} target="_blank" rel="noreferrer">Business document ↗</a>}{item.status === "pending" && <form action={reviewLibraryApplication} className="mt-4 grid gap-3 border-t border-slate-100 pt-4"><input type="hidden" name="applicationId" value={item.id}/><textarea name="adminNote" rows={2} maxLength={2000} placeholder="Admin note / rejection reason (optional)" className="w-full rounded-xl border border-slate-200 p-3 text-sm"/><div className="flex flex-wrap gap-2"><button name="decision" value="approved" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Approve library</button><button name="decision" value="rejected" className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white">Reject application</button></div></form>}</article>)}</div> : <Empty text="এখনো কোনো লাইব্রেরি আবেদন জমা হয়নি।"/>;
  } else if (section === "books") {
    const { data, error } = await supabase.from("library_book_offers").select("id,title,author,publisher,isbn,edition,cost_price,selling_price,stock_quantity,availability,is_active,library_partners(library_name)").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("পার্টনার বই লোড করা যায়নি।", { cause: error });
    content = <Rows rows={(data ?? []).map((x) => [x.title, x.library_partners?.[0]?.library_name ?? "Library", x.publisher ?? "—", x.edition ?? "—", money(x.cost_price), money(x.selling_price), String(x.stock_quantity), x.availability])} headers={["বই","লাইব্রেরি","প্রকাশক","সংস্করণ","ক্রয়মূল্য","বিক্রয়মূল্য","স্টক","অবস্থা"]}/>;
  } else if (section === "assignments") {
    const { data, error } = await supabase.from("library_order_assignments").select("id,order_id,status,assigned_at,library_partners(library_name)").order("assigned_at", { ascending: false }).limit(200);
    if (error) throw new Error("অর্ডার বরাদ্দ লোড করা যায়নি।", { cause: error });
    content = <Rows rows={(data ?? []).map((x) => [x.order_id.slice(0,8).toUpperCase(), x.library_partners?.[0]?.library_name ?? "Library", x.status, new Date(x.assigned_at).toLocaleString("en-GB")])} headers={["অর্ডার","লাইব্রেরি","স্ট্যাটাস","বরাদ্দের সময়"]}/>;
  } else if (section === "delivery") {
    const { data, error } = await supabase.from("library_shipments").select("id,courier_name,tracking_number,tracking_url,status,shipped_at,library_order_assignments(order_id,library_partners(library_name))").order("updated_at", { ascending: false }).limit(200);
    if (error) throw new Error("ডেলিভারি তথ্য লোড করা যায়নি।", { cause: error });
    content = <Rows rows={(data ?? []).map((x) => [x.library_order_assignments?.[0]?.order_id?.slice(0,8).toUpperCase() ?? "—", x.library_order_assignments?.[0]?.library_partners?.[0]?.library_name ?? "—", x.courier_name ?? "—", x.tracking_number ?? "—", x.status, x.tracking_url ?? "—"])} headers={["অর্ডার","লাইব্রেরি","কুরিয়ার","ট্র্যাকিং নম্বর","অবস্থা","ট্র্যাকিং লিংক"]}/>;
  } else {
    const { data, error } = await supabase.from("library_commissions").select("id,order_total,commission_rate,commission_amount,settlement_status,settled_at,settlement_reference,library_partners(library_name)").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("কমিশন তথ্য লোড করা যায়নি।", { cause: error });
    content = <Rows rows={(data ?? []).map((x) => [x.library_partners?.[0]?.library_name ?? "Library", money(x.order_total), `${x.commission_rate}%`, money(x.commission_amount), x.settlement_status, x.settled_at ? new Date(x.settled_at).toLocaleDateString("en-GB") : "—", x.settlement_reference ?? "—"])} headers={["লাইব্রেরি","অর্ডার মূল্য","কমিশন হার","কমিশন","নিষ্পত্তি","তারিখ","রেফারেন্স"]}/>;
  }

  return <main className="min-h-screen bg-[#f3f7f5] px-4 py-7 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl">
    <p className="text-xs font-extrabold uppercase tracking-[.2em] text-emerald-700">Sikkha Nogori · Super Admin</p>
    <h1 className="mt-2 text-3xl font-black">Library Partnership</h1><p className="mt-2 text-sm text-slate-600">লাইব্রেরি পার্টনারদের আবেদন থেকে কমিশন নিষ্পত্তি পর্যন্ত ব্যবস্থাপনা।</p>
    <nav aria-label="Library partnership steps" className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-5">{sections.map(([key,label],i)=><Link key={key} href={`/admin/partners/${key}`} className={`rounded-xl border px-3 py-3 text-sm font-bold ${key===section ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400"}`}><span className="block text-[10px] opacity-70">STEP {i+1}</span>{label}</Link>)}</nav>
    <header className="mt-7"><h2 className="text-2xl font-extrabold">{active[1]}</h2><p className="mt-1 text-sm text-slate-600">{active[2]}</p></header>
    {status && messages[status] && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{messages[status]}</p>}
    <section className="mt-5">{content}</section>
  </div></main>;
}

function Empty({text}:{text:string}) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{text}</div>; }
function Rows({headers,rows}:{headers:string[];rows:string[][]}) { return rows.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr>{headers.map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j} className="max-w-64 break-words px-4 py-3">{v.startsWith("https://") ? <a href={v} target="_blank" rel="noreferrer" className="text-emerald-800 underline">Open ↗</a> : v}</td>)}</tr>)}</tbody></table></div> : <Empty text="এখনো কোনো তথ্য যোগ হয়নি।"/>; }
