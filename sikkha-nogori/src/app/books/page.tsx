```tsx
import Link from "next/link";

const books = [
  {
    title: "আরবি ভাষা শিক্ষা",
    category: "আরবি শিক্ষা",
    description: "আরবি ভাষা শেখার জন্য প্রয়োজনীয় বই ও শিক্ষাসামগ্রী।",
  },
  {
    title: "ইসলামিক জ্ঞান",
    category: "ইসলামিক বই",
    description: "ইসলাম সম্পর্কে জ্ঞান অর্জনের জন্য উপকারী বই।",
  },
  {
    title: "দক্ষতা উন্নয়ন",
    category: "দক্ষতা",
    description: "নতুন দক্ষতা অর্জন ও আত্মোন্নয়নের জন্য বই।",
  },
];

export default function BooksPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <nav className="flex flex-wrap gap-5">
          <Link href="/" className="font-semibold text-emerald-700">
            হোম
          </Link>
          <Link href="/blog" className="font-semibold text-emerald-700">
            ব্লগ
          </Link>
        </nav>

        <h1 className="mt-8 text-4xl font-bold">
          শিক্ষা নগরী — বইয়ের সংগ্রহ
        </h1>

        <p className="mt-3 text-slate-600">
          পছন্দের বিষয় বেছে নিন এবং শেখা শুরু করুন।
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {books.map((book) => (
            <article
              key={book.title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <p className="text-sm font-semibold text-emerald-700">
                {book.category}
              </p>

              <h2 className="mt-3 text-xl font-bold">
                {book.title}
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                {book.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
```