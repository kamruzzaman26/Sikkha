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
  const [showForm, setShowForm] = useState(false);

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

  // Load server-backed feedback after mount; state updates occur when the request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

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
    if (!error) { setReviewTitle(""); setReviewBody(""); setShowForm(false); }
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

  const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, n: reviews.filter((r) => r.rating === star).length }));
  const maxN = Math.max(1, ...distribution.map((d) => d.n));
  const stars = (value: number) => "★".repeat(Math.round(value)) + "☆".repeat(5 - Math.round(value));

  return (
    <section id="book-feedback" className="mt-6 scroll-mt-24 space-y-5" aria-label="ক্রেতাদের মতামত ও প্রশ্ন">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-slate-950">Reviews and Ratings</h2>
          <button type="button" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm} className="rounded-md border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">রিভিউ লিখুন</button>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-center">
            {count > 0 && <p className="text-3xl font-extrabold text-slate-950">{average.toFixed(1)}</p>}
            <p className={`text-2xl tracking-wide ${count > 0 ? "text-amber-500" : "text-slate-300"}`} aria-hidden="true">{stars(count > 0 ? average : 0)}</p>
            <p className="mt-1 text-sm text-slate-600">{count} Ratings and {count} Reviews</p>
          </div>
          <div className="h-20 w-px bg-slate-200" aria-hidden="true" />
          <ul className="space-y-1.5" aria-label="Rating distribution">
            {distribution.map((d) => (
              <li key={d.star} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-6 shrink-0">{d.star} ★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${(d.n / maxN) * 100}%` }} /></span>
                <span className="w-5 shrink-0 text-right">{d.n}</span>
              </li>
            ))}
          </ul>
        </div>

        {showForm && (
          <form onSubmit={submitReview} className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
            <h3 className="font-bold">আপনার রিভিউ লিখুন</h3>
            <div role="radiogroup" aria-label="রেটিং" className="flex gap-1 text-3xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={Number(rating) === n} aria-label={`${n} star`} onClick={() => setRating(String(n))} className={Number(rating) >= n ? "text-amber-500" : "text-slate-300"}>★</button>
              ))}
            </div>
            <input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} maxLength={120} placeholder="রিভিউয়ের শিরোনাম (ঐচ্ছিক)" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" />
            <textarea required minLength={10} maxLength={3000} value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} placeholder="আপনার অভিজ্ঞতা লিখুন (কমপক্ষে ১০ অক্ষর)" rows={4} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" />
            <div className="flex gap-2">
              <button disabled={sending} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{sending ? "জমা হচ্ছে…" : "রিভিউ জমা দিন"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">বাতিল</button>
            </div>
          </form>
        )}

        {loading ? <p className="mt-5 text-sm text-slate-500">রিভিউ লোড হচ্ছে…</p> : reviews.length > 0 && (
          <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
            {reviews.map((review) => (
              <article key={review.id} className="border-b border-slate-100 pb-4 last:border-0">
                <p className="text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{stars(review.rating)}</p>
                {review.title && <h3 className="mt-1 font-bold">{review.title}</h3>}
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{review.body}</p>
                <time className="mt-2 block text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString("bn-BD")}</time>
              </article>
            ))}
          </div>
        )}
        {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      </div>

      <div id="book-qa" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-xl font-extrabold text-slate-950">Q&amp;A</h2>
        {questions.length ? <div className="mt-4 space-y-4">{questions.map((item) => <article key={item.id} className="border-b border-slate-100 pb-4 last:border-0"><p className="font-semibold text-slate-900">প্রশ্ন: {item.question}</p><p className="mt-2 text-sm leading-6 text-slate-600">উত্তর: {item.answer}</p></article>)}</div> : <p className="mt-3 text-sm text-slate-500">এখনো কোনো উত্তরযুক্ত প্রশ্ন নেই।</p>}
        <form onSubmit={submitQuestion} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <h3 className="font-bold">বই সম্পর্কে প্রশ্ন করুন</h3>
          <textarea required minLength={10} maxLength={1500} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="আপনার প্রশ্ন লিখুন (কমপক্ষে ১০ অক্ষর)" rows={3} className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          <button disabled={sending} className="rounded-lg border border-blue-600 px-4 py-2.5 text-sm font-bold text-blue-700 disabled:opacity-50">{sending ? "জমা হচ্ছে…" : "প্রশ্ন জমা দিন"}</button>
        </form>
      </div>
    </section>
  );
}
