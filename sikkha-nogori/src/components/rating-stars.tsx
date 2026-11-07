// Star row from the approved card design. Ratings are not stored yet, so with no
// value it renders grey stars and says so instead of showing an invented score.
export function RatingStars({ rating, count }: { rating?: number | null; count?: number | null }) {
  const has = typeof rating === "number" && rating > 0;
  const filled = has ? Math.floor(rating) : 0;
  return (
    <div className="mt-1 flex items-center gap-1" aria-label={has ? `Rating ${rating}` : "No ratings yet"}>
      <span className="flex" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} viewBox="0 0 20 20" className={`size-3 ${i < filled ? "fill-amber-400" : "fill-slate-200"}`}>
            <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 14.9 4.6 18l1.2-6L1.3 7.8l6.1-.7L10 1.5z" />
          </svg>
        ))}
      </span>
      <span className="text-[10px] font-semibold text-slate-500">
        {has ? `${rating}${count ? ` (${count})` : ""}` : "No ratings"}
      </span>
    </div>
  );
}
