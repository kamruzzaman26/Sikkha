import Link from "next/link";
import BookCard from "@/components/book-card";
import { bookCategories, getBooksInCategory } from "@/lib/books";

export default function BookCategoryPage({
  categorySlug,
}: {
  categorySlug: string;
}) {
  const category = bookCategories.find((item) => item.slug === categorySlug);

  if (!category) {
    return null;
  }

  const categoryBooks = getBooksInCategory(categorySlug);

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">
            হোম
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <Link
            href="/books"
            className="font-semibold text-emerald-800 hover:underline"
          >
            সকল বই
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <span>{category.title}</span>
        </nav>

        <header className="mt-8">
          <p className="text-sm font-bold text-emerald-700">বইয়ের বিভাগ</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            {category.title}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            এই বিভাগে {categoryBooks.length}টি নমুনা বই রয়েছে। বইয়ের তথ্য ও
            মূল্য প্রকাশের আগে যাচাই করে নিন।
          </p>
        </header>

        {categoryBooks.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {categoryBooks.map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <p className="text-slate-600">
              এই বিভাগে এখনো কোনো নমুনা বই নেই।
            </p>
            <Link
              href="/books"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
            >
              সব বই দেখুন
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
