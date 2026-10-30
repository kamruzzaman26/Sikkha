import type { Book } from "@/lib/books";

export default function BookCover({
  book,
  className = "",
}: {
  book: Pick<Book, "title" | "cover" | "coverAccent">;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${book.title} বইয়ের নমুনা প্রচ্ছদ`}
      className={`flex aspect-[3/4] w-36 flex-col items-center justify-center rounded-r-lg border-l-4 border-white/25 px-3 text-center text-white shadow-xl sm:w-44 ${book.coverAccent} ${className}`}
    >
      <span aria-hidden="true" className="mb-3 text-2xl text-amber-200">
        ✦
      </span>
      <span className="whitespace-pre-line text-lg font-bold leading-7">
        {book.cover}
      </span>
      <span className="mt-3 h-px w-10 bg-white/50" />
      <span className="mt-2 text-xs text-white/80">শিক্ষা নগরী</span>
    </div>
  );
}
