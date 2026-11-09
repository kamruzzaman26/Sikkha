"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { plainText, readingMinutes, renderPostContent } from "@/lib/blog-content";
import { saveBlogPost } from "@/app/admin/blog/actions";

export type EditablePost = {
  id: string; title: string; slug: string; excerpt: string; content: string; coverUrl: string;
  seoTitle: string; seoDescription: string; categoryId: string; status: "draft" | "published" | "archived";
  publishAt: string; // Dhaka local "YYYY-MM-DDTHH:mm" or ""
};

const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600";

function slugify(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const tone = value === 0 ? "text-slate-400" : value < min ? "text-amber-600" : value > max ? "text-rose-600" : "text-emerald-600";
  return <span className={`text-[11px] font-semibold tabular-nums ${tone}`}>{value}/{max}</span>;
}

const tools: { label: string; title: string; before: string; after?: string; block?: boolean }[] = [
  { label: "H2", title: "Heading", before: "## ", block: true },
  { label: "H3", title: "Sub-heading", before: "### ", block: true },
  { label: "B", title: "Bold", before: "**", after: "**" },
  { label: "I", title: "Italic", before: "*", after: "*" },
  { label: "• List", title: "Bullet list", before: "- ", block: true },
  { label: "1. List", title: "Numbered list", before: "1. ", block: true },
  { label: "❝ Quote", title: "Quote", before: "> ", block: true },
  { label: "Link", title: "Link", before: "[", after: "](https://)" },
  { label: "Image", title: "Image (https link)", before: "![describe the image](https://", after: ")" },
];

export function AdminPostEditor({
  post, categories, siteName,
}: {
  post: EditablePost | null;
  categories: { id: string; name: string }[];
  siteName: string;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [content, setContent] = useState(post?.content ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? "");
  const [coverUrl, setCoverUrl] = useState(post?.coverUrl ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const area = useRef<HTMLTextAreaElement>(null);

  const onTitle = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  function apply(tool: (typeof tools)[number]) {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    let next: string;
    let cursor: number;
    if (tool.block) {
      // Headings, lists and quotes prefix the current line.
      const lineStart = content.lastIndexOf("\n", a - 1) + 1;
      next = content.slice(0, lineStart) + tool.before + content.slice(lineStart);
      cursor = b + tool.before.length;
    } else {
      const selected = content.slice(a, b) || "text";
      const insert = `${tool.before}${selected}${tool.after ?? ""}`;
      next = content.slice(0, a) + insert + content.slice(b);
      cursor = a + insert.length;
    }
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  const words = plainText(content).split(/\s+/).filter(Boolean).length;
  const rendered = tab === "preview" ? renderPostContent(content).nodes : null;
  const previewTitle = (seoTitle || title || "Article title") + ` | ${siteName}`;
  const previewDesc = seoDescription || excerpt || plainText(content).slice(0, 160) || "The description search engines show appears here.";

  return (
    <form action={saveBlogPost} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div>
        <label className={label} htmlFor="post-title">Article title</label>
        <input id="post-title" name="title" required minLength={3} maxLength={180} value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Write a clear, specific title" className={`${input} text-base font-semibold`} />
      </div>

      <div>
        <div className="mb-1.5 flex items-end justify-between gap-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-600" htmlFor="post-content">Article content</label>
          <div role="tablist" aria-label="Editor view" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold">
            {(["write", "preview"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 capitalize transition ${tab === t ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{t}</button>
            ))}
          </div>
        </div>
        {tab === "write" && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tools.map((tool) => (
              <button key={tool.label} type="button" title={tool.title} onClick={() => apply(tool)} className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 active:scale-95">{tool.label}</button>
            ))}
          </div>
        )}
        {/* Always mounted so the text is submitted from either tab. */}
        <textarea ref={area} id="post-content" name="content" required maxLength={50000} value={content} onChange={(e) => setContent(e.target.value)} placeholder={"Start writing…\n\n## Use headings to split the article\n\nShort paragraphs are easier to read."} className={`${input} min-h-[22rem] resize-y font-[inherit] leading-7 ${tab === "write" ? "" : "hidden"}`} />
        {tab === "preview" && (
          <div className="min-h-[22rem] rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
            {content.trim() ? (
              <>
                <h2 className="text-3xl font-extrabold leading-tight">{title || "Untitled"}</h2>
                <div>{rendered}</div>
              </>
            ) : <p className="text-sm text-slate-400">Nothing to preview yet.</p>}
          </div>
        )}
        <p className="mt-1.5 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500">
          <span>Tip: use <b>##</b> for headings, <b>-</b> for bullets, <b>**bold**</b>, <b>[text](https://link)</b>.</span>
          <span className="tabular-nums">{words} words · about {readingMinutes(content)} min read</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="post-category">Category</label>
          <select id="post-category" name="categoryId" defaultValue={post?.categoryId ?? ""} className={input}>
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="post-cover">Cover image link (https)</label>
          <input id="post-cover" name="coverUrl" type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…/image.jpg" className={input} />
        </div>
      </div>
      {coverUrl.startsWith("https://") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="Cover preview" className="aspect-[16/9] w-full max-w-md rounded-xl border border-slate-200 object-cover" />
      )}

      <div>
        <div className="mb-1.5 flex items-end justify-between"><label className="block text-xs font-bold uppercase tracking-wide text-slate-600" htmlFor="post-excerpt">Short summary</label><Counter value={excerpt.length} min={50} max={500} /></div>
        <textarea id="post-excerpt" name="excerpt" rows={2} maxLength={500} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="One or two sentences shown on the blog list and under the title" className={input} />
      </div>

      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <legend className="px-1 text-xs font-extrabold uppercase tracking-wide text-slate-700">Google search preview</legend>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="truncate text-xs text-slate-500">{siteName} › blog › {slug || "your-article-url"}</p>
          <p className="mt-1 line-clamp-2 text-lg leading-snug text-[#1a0dab]">{previewTitle}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{previewDesc}</p>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1.5 flex items-end justify-between"><label className={label} htmlFor="seo-title">Search title (optional)</label><Counter value={seoTitle.length} min={30} max={60} /></div>
            <input id="seo-title" name="seoTitle" maxLength={200} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Leave empty to use the article title" className={input} />
          </div>
          <div>
            <div className="mb-1.5 flex items-end justify-between"><label className={label} htmlFor="seo-description">Search description (optional)</label><Counter value={seoDescription.length} min={70} max={160} /></div>
            <textarea id="seo-description" name="seoDescription" rows={2} maxLength={320} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="70–160 characters that make people want to click" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="post-slug">Page address (URL)</label>
            <input id="post-slug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={180} value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true); }} placeholder="my-article-title" className={input} />
            <p className="mt-1 text-[11px] text-slate-500">English letters, numbers and dashes only. Created from your title automatically — for a Bangla title, type a short English address such as <code>how-to-read-quran</code>. Don’t change it after publishing.</p>
          </div>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="post-status">Status</label>
          <select id="post-status" name="status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={input}>
            <option value="draft">Draft — only you can see it</option>
            <option value="published">Published — visible to everyone</option>
            <option value="archived">Archived — hidden</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="post-publish-at">Publish date &amp; time (optional)</label>
          <input id="post-publish-at" name="publishAt" type="datetime-local" defaultValue={post?.publishAt ?? ""} className={input} />
          <p className="mt-1 text-[11px] text-slate-500">Dhaka time. A future time schedules the article; empty means now.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <AdminSubmitButton pendingLabel="Saving…" className="min-h-12 flex-1 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-md transition hover:bg-brand-700">
          {status === "published" ? (post ? "Save & keep published" : "Publish article") : post ? "Save changes" : "Save draft"}
        </AdminSubmitButton>
        {post && <Link href="/admin/blog" className="inline-flex min-h-12 items-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</Link>}
      </div>
    </form>
  );
}
