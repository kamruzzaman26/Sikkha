"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Review = { id: string; rating: number; title: string | null; body: string; created_at: string };
type Question = { id: string; question: string; answer: string; created_at: string };

export default function BookFeedback({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [average, setAverage] = useState<number>(0);
  const [count, setCount] = useState(0);
  const [rating, setRating] = useState("5");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const [reviewResult, questionResult, summaryResult] = await Promise.all([
      supabase.from("product_reviews").select("id,rating,title,body,created_at").eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false }).limit(30),
      supabase.from("product_questions").select("id,question,answer,created_at").eq("product_id", productId).eq("status", "answered").not("answer", "is", null).order("created_at", { ascending: false }).limit(30),
      supabase.rpc("get_product_review_summary", { p_product_id: productId }),
    ]);
    if (!reviewResult.error) setReviews((reviewResult.data ?? []) as Review[]);
    if (!questionResult.error) setQuestions((questionResult.data ?? []) as Question[]);
    const summary = Array.isArray(summaryResult.data) ? summaryResult.data[0] : null;
    if (summary) {
      setAverage(Number(summary.average_rating) || 0);
      setCount(Number(summary.review_count) || 0);
    }
    setLoading(false);
  }, [productId]);

  // Load server-backed feedback after mount; state updates occur when the request resolves.\n  // eslint-disable-next-line react-hooks/set-state-in-effect\n  useEffect(() => { void load(); }, [load]);

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("রিভিউ দিতে আগে লগইন করুন।"); setSending(false); return; }
    const { error } = await supabase.from("product_reviews").insert({
      product_id: productId, user_id: user.id, rating: Number(rating),
      title: reviewTitle.trim() || null, body: reviewBody.trim(),
    });
    setMessage(error ? (error.code === "23505" ? "এই বইয়ে আপনার রিভিউ আগে জমা হয়েছে।" : "রিভিউ জমা হয়নি। অর্ডার সম্পন্ন হয়েছে কি না যাচাই করুন।") : "রিভিউ জমা হয়েছে। অনুমোদনের পর প্রকাশিত হবে।");
    if (!error) { setReviewTitle(""); setReviewBody(""); }
    setSending(false);
  }

  async function submitQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("প্রশ্ন করতে আগে লগইন করুন।"); setSending(false); return; }
    const { error } = await supabase.from("product_questions").insert({ product_id: productId, user_id: user.id, question: question.trim() });
    setMessage(error ? "প্রশ্ন জমা হয়নি। আবার চেষ্টা করুন।" : "প্রশ্ন জমা হয়েছে। উত্তর দেওয়া হলে এখানে দেখা যাবে।");
    if (!error) setQuestion("");
    setSending(false);
  }

  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-2" aria-label="ক্রেতাদের মতামত ও প্রশ্ন">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-slate-950">ক্রেতাদের রিভিউ</h2>
          <span className="text-sm font-semibold text-emerald-800">{count ? `★ ${average.toFixed(1)} · ${count}টি` : "এখনো রিভিউ নেই"}</span>
        </div>
        {loading ? <p className="mt-4 text-sm text-slate-500">রিভিউ লোড হচ্ছে…</p> : reviews.length ? (
          <div className="mt-4 space-y-4">{reviews.map((review) => <article key={review.id} className="border-b border-slate-100 pb-4 last:border-0"><p className="text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</p>{review.title && <h3 className="mt-1 font-bold">{review.title}</h3>}<p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{review.body}</p><time className="mt-2 block text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString("bn-BD")}</time></article>)}</div>
        ) : <p className="mt-4 text-sm text-slate-500">অনুমোদিত রিভিউ প্রকাশিত হলে এখানে দেখা যাবে।</p>}
        <form onSubmit={submitReview} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <h3 className="font-bold">আপনার রিভিউ লিখুন</h3>
          <label className="block text-sm font-medium">রেটিং <select value={rating} onChange={(e)=>setRating(e.target.value)} className="ml-2 rounded-lg border border-slate-300 p-2"><option value="5">৫ ★</option><option value="4">৪ ★</option><option value="3">৩ ★</option><option value="2">২ ★</option><option value="1">১ ★</option></select></label>
          <input value={reviewTitle} onChange={(e)=>setReviewTitle(e.target.value)} maxLength={120} placeholder="রিভিউয়ের শিরোনাম (ঐচ্ছিক)" className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          <textarea required minLength={10} maxLength={3000} value={reviewBody} onChange={(e)=>setReviewBody(e.target.value)} placeholder="আপনার অভিজ্ঞতা লিখুন (কমপক্ষে ১০ অক্ষর)" rows={3} className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          <button disabled={sending} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{sending ? "জমা হচ্ছে…" : "রিভিউ জমা দিন"}</button>
        </form>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-extrabold text-slate-950">প্রশ্ন ও উত্তর</h2>
        {questions.length ? <div className="mt-4 space-y-4">{questions.map((item)=><article key={item.id} className="border-b border-slate-100 pb-4 last:border-0"><p className="font-semibold text-slate-900">প্রশ্ন: {item.question}</p><p className="mt-2 text-sm leading-6 text-slate-600">উত্তর: {item.answer}</p></article>)}</div> : <p className="mt-4 text-sm text-slate-500">এখনো কোনো উত্তরযুক্ত প্রশ্ন নেই।</p>}
        <form onSubmit={submitQuestion} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <h3 className="font-bold">বই সম্পর্কে প্রশ্ন করুন</h3>
          <textarea required minLength={10} maxLength={1500} value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder="আপনার প্রশ্ন লিখুন (কমপক্ষে ১০ অক্ষর)" rows={4} className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          <button disabled={sending} className="rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-50">{sending ? "জমা হচ্ছে…" : "প্রশ্ন জমা দিন"}</button>
        </form>
        {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      </div>
    </section>
  );
}
