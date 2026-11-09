import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ShareLinks } from "@/components/share-links";
import { plainText, renderPostContent } from "@/lib/blog-content";
import { formatPostDate, getPublishedPostBySlug, getPublishedPosts } from "@/lib/blog-posts";
import { getSiteSettings, resolveSiteOrigin } from "@/lib/site-settings";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [post, { general, seo }] = await Promise.all([getPublishedPostBySlug(slug), getSiteSettings()]);
  if (!post) return { title: "লেখা পাওয়া যায়নি", robots: { index: false, follow: false } };

  const title = `${post.seoTitle || post.title} | ${general.siteName}`;
  const description = (post.seoDescription || post.excerpt || plainText(post.content)).slice(0, 160);
  const image = post.coverUrl || seo.ogImage;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title, description, type: "article", url: `/blog/${post.slug}`,
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}

async function Article({ params }: Pick<PageProps<"/blog/[slug]">, "params">) {
  await connection();
  const { slug } = await params;
  const [post, { general, seo }, everything] = await Promise.all([
    getPublishedPostBySlug(slug), getSiteSettings(), getPublishedPosts(12),
  ]);
  if (!post) notFound();

  const { nodes, headings } = renderPostContent(post.content);
  const others = everything.filter((p) => p.slug !== post.slug);
  const related = [...others.filter((p) => post.categoryId && p.categoryId === post.categoryId), ...others.filter((p) => !post.categoryId || p.categoryId !== post.categoryId)].slice(0, 3);

  const origin = resolveSiteOrigin(seo);
  const url = origin ? `${origin}/blog/${post.slug}` : undefined;
  const jsonLd = origin && {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.seoDescription || post.excerpt,
        ...(post.coverUrl || seo.ogImage ? { image: [post.coverUrl || seo.ogImage] } : {}),
        ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
        dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
        inLanguage: "bn",
        mainEntityOfPage: url,
        author: { "@type": "Organization", name: general.siteName },
        publisher: { "@type": "Organization", name: general.siteName, ...(general.logoUrl ? { logo: { "@type": "ImageObject", url: general.logoUrl } } : {}) },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "হোম", item: origin },
          { "@type": "ListItem", position: 2, name: "ব্লগ", item: `${origin}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <article className="mx-auto max-w-3xl">
        <nav aria-label="পথনির্দেশ" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-800 hover:underline">হোম</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <Link href="/blog" className="font-semibold text-emerald-800 hover:underline">ব্লগ</Link>
        </nav>

        <header className="mt-6">
          {post.category && <p className="text-sm font-bold text-emerald-700">{post.category}</p>}
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-[2.6rem] sm:leading-[1.2]">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-lg leading-8 text-slate-600">{post.excerpt}</p>}
          <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-slate-200 py-3 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{general.siteName}</span>
            {post.publishedAt && <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>}
            <span>{post.minutes} মিনিটের পাঠ</span>
          </p>
        </header>

        {post.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt={post.title} className="mt-6 aspect-[16/9] w-full rounded-3xl border border-slate-200 object-cover" />
        )}

        {headings.length >= 3 && (
          <nav aria-label="এই লেখায় কী আছে" className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
            <p className="text-sm font-extrabold text-emerald-900">এই লেখায় যা আছে</p>
            <ol className="mt-2 space-y-1.5 text-[15px]">
              {headings.filter((h) => h.level === 2).map((h) => (
                <li key={h.id}><a href={`#${h.id}`} className="text-emerald-800 hover:underline">{h.text}</a></li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-4">{nodes}</div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold">লেখাটি ভালো লাগলে শেয়ার করুন</p>
          <ShareLinks url={url} title={post.title} />
        </div>

        <aside className="mt-6 rounded-2xl bg-emerald-800 p-6 text-white sm:p-8">
          <h2 className="text-xl font-extrabold">পড়ার জন্য বই খুঁজছেন?</h2>
          <p className="mt-2 leading-7 text-emerald-50">আমাদের সংগ্রহ থেকে আপনার পছন্দের বই ও কোর্স দেখুন।</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/books" className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 font-bold text-emerald-900 hover:bg-emerald-50">বইয়ের সংগ্রহ</Link>
            <Link href="/courses" className="inline-flex min-h-11 items-center rounded-xl border border-white/40 px-5 font-bold text-white hover:bg-white/10">অনলাইন কোর্স</Link>
          </div>
        </aside>

        {related.length > 0 && (
          <section className="mt-12" aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-xl font-extrabold">আরও পড়ুন</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm">
                    {p.category && <span className="text-xs font-bold text-emerald-700">{p.category}</span>}
                    <span className="mt-1 font-bold leading-snug">{p.title}</span>
                    <span className="mt-auto pt-3 text-xs text-slate-500">{p.minutes} মিনিটের পাঠ</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}

export default function BlogArticlePage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7faf8] px-5 py-10"><div className="mx-auto h-96 max-w-3xl animate-pulse rounded-3xl bg-white" /></main>}>
      <Article params={params} />
    </Suspense>
  );
}
