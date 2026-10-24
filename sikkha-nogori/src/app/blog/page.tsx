import Link from "next/link";

const posts = [
  {
      title: "ইসলামিক বই পড়া শুরু করবেন যেভাবে",
          category: "ইসলামিক বই",
              description:
                    "নিজের জ্ঞান বাড়াতে উপযুক্ত বই বাছাই ও পড়ার অভ্যাস গড়ার সহজ নির্দেশনা।",
                      },
                        {
                            title: "আরবি ভাষা শেখার প্রথম ধাপ",
                                category: "আরবি শিক্ষা",
                                    description:
                                          "আরবি শব্দভান্ডার, নাহু ও সরফ শেখার জন্য একটি সহজ সূচনা।",
                                            },
                                              {
                                                  title: "অনলাইনে দক্ষতা শেখার উপায়",
                                                      category: "দক্ষতা উন্নয়ন",
                                                          description:
                                                                "নিজের লক্ষ্য অনুযায়ী অনলাইন কোর্স ও শেখার উপকরণ বেছে নিন।",
                                                                  },
                                                                  ];

                                                                  export default function BlogPage() {
                                                                    return (
                                                                        <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
                                                                              <div className="mx-auto max-w-5xl">
                                                                                      <Link
                                                                                                href="/"
                                                                                                          className="font-semibold text-emerald-700"
                                                                                                                  >
                                                                                                                            ← শিক্ষা নগরী
                                                                                                                                    </Link>

                                                                                                                                            <h1 className="mt-8 text-4xl font-bold">
                                                                                                                                                      শিক্ষা নগরী ব্লগ
                                                                                                                                                              </h1>

                                                                                                                                                                      <p className="mt-3 text-slate-600">
                                                                                                                                                                                পড়ুন, শিখুন এবং জ্ঞানকে কাজে লাগান।
                                                                                                                                                                                        </p>

                                                                                                                                                                                                <div className="mt-8 grid gap-5 md:grid-cols-3">
                                                                                                                                                                                                          {posts.map((post) => (
                                                                                                                                                                                                                      <article
                                                                                                                                                                                                                                    key={post.title}
                                                                                                                                                                                                                                                  className="rounded-2xl border border-slate-200 bg-white p-6"
                                                                                                                                                                                                                                                              >
                                                                                                                                                                                                                                                                            <p className="text-sm font-semibold text-emerald-700">
                                                                                                                                                                                                                                                                                            {post.category}
                                                                                                                                                                                                                                                                                                          </p>

                                                                                                                                                                                                                                                                                                                        <h2 className="mt-3 text-xl font-bold">
                                                                                                                                                                                                                                                                                                                                        {post.title}
                                                                                                                                                                                                                                                                                                                                                      </h2>

                                                                                                                                                                                                                                                                                                                                                                    <p className="mt-3 leading-7 text-slate-600">
                                                                                                                                                                                                                                                                                                                                                                                    {post.description}
                                                                                                                                                                                                                                                                                                                                                                                                  </p>
                                                                                                                                                                                                                                                                                                                                                                                                              </article>
                                                                                                                                                                                                                                                                                                                                                                                                                        ))}
                                                                                                                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                          </main>
                                                                                                                                                                                                                                                                                                                                                                                                                                            );
                                                                                                                                                                                                                                                                                                                                                                                                                                            }