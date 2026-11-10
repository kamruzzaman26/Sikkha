import type { ReactNode } from "react";

export type Heading = { id: string; text: string; level: 2 | 3 };

/** Words per minute for Bangla/English mixed reading. */
export function readingMinutes(content: string): number {
  const words = content.replace(/[#>*_`\-\[\]()!]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

/** Plain text (no markup), for descriptions and counters. */
export function plainText(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SAFE_URL = /^(https?:\/\/[^\s)]+|\/[^\s)]*|mailto:[^\s)]+)$/;
const INLINE = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const key = `${keyBase}-${n++}`;
    if (match[2]) out.push(<strong key={key} className="font-bold text-slate-900">{match[2]}</strong>);
    else if (match[4]) out.push(<em key={key}>{match[4]}</em>);
    else if (match[6] && SAFE_URL.test(match[7])) {
      const external = /^https?:/.test(match[7]);
      out.push(
        <a
          key={key}
          href={match[7]}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900"
        >
          {match[6]}
        </a>,
      );
    } else out.push(match[0]);
    last = index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Renders the simple writing format used by the Blog Studio. Everything is
 * built as React elements (never raw HTML), so post content cannot inject
 * scripts.
 *
 *   ## Heading   ### Sub-heading   - bullet   1. numbered   > quote
 *   **bold**  *italic*  [link](https://…)  ![alt](https://image)  ---
 */
export function renderPostContent(content: string): { nodes: ReactNode[]; headings: Heading[] } {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  const headings: Heading[] = [];
  let i = 0;
  let k = 0;

  const isBlockStart = (line: string) =>
    /^(#{1,3})\s+/.test(line) || /^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line) || /^>\s?/.test(line) || /^---+$/.test(line.trim()) || /^!\[[^\]]*\]\(/.test(line.trim());

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }
    const key = `b${k++}`;

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length === 3 ? 3 : 2;
      const id = `section-${headings.length + 1}`;
      headings.push({ id, text: heading[2], level });
      nodes.push(
        level === 2 ? (
          <h2 key={key} id={id} className="mt-10 scroll-mt-24 text-2xl font-extrabold leading-snug text-slate-900">{inline(heading[2], key)}</h2>
        ) : (
          <h3 key={key} id={id} className="mt-7 scroll-mt-24 text-xl font-bold leading-snug text-slate-900">{inline(heading[2], key)}</h3>
        ),
      );
      i++;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      nodes.push(<hr key={key} className="my-8 border-slate-200" />);
      i++;
      continue;
    }

    const image = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)(?:\{([a-z0-9=\s:/-]*)\})?$/.exec(trimmed);
    if (image) {
      const opts = Object.fromEntries((image[3] ?? "").split(/\s+/).filter(Boolean).map((p) => p.split("=") as [string, string]));
      const widths: Record<string, string> = { sm: "max-w-xs", md: "max-w-xl", lg: "max-w-3xl", full: "max-w-full" };
      const aligns: Record<string, string> = { left: "mr-auto", center: "mx-auto", right: "ml-auto" };
      const ratios: Record<string, string> = { "16:9": "aspect-video", "4:3": "aspect-[4/3]", "1:1": "aspect-square", "3:2": "aspect-[3/2]" };
      nodes.push(
        <figure key={key} className={`my-7 w-full ${widths[opts.size] ?? "max-w-full"} ${aligns[opts.align] ?? "mx-auto"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image[2]} alt={image[1]} loading="lazy" className={`w-full rounded-2xl border border-slate-200 bg-slate-100 ${ratios[opts.ratio] ? `${ratios[opts.ratio]} object-cover` : ""}`} />
          {image[1] && <figcaption className="mt-2 text-center text-sm text-slate-500">{image[1]}</figcaption>}
        </figure>,
      );
      i++;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      nodes.push(
        <blockquote key={key} className="my-6 border-l-4 border-emerald-500 bg-emerald-50/60 py-3 pl-5 pr-4 text-lg leading-8 text-slate-700">
          {inline(quote.join(" "), key)}
        </blockquote>,
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+/.test(line);
    const numbered = /^\s*\d+\.\s+/.test(line);
    if (bullet || numbered) {
      const items: string[] = [];
      const pattern = bullet ? /^\s*[-*]\s+(.*)$/ : /^\s*\d+\.\s+(.*)$/;
      while (i < lines.length) {
        const m = pattern.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      const children = items.map((item, idx) => <li key={idx} className="pl-1">{inline(item, `${key}-${idx}`)}</li>);
      nodes.push(
        bullet ? (
          <ul key={key} className="my-5 list-disc space-y-2 pl-6 text-[17px] leading-8 text-slate-700 marker:text-emerald-600">{children}</ul>
        ) : (
          <ol key={key} className="my-5 list-decimal space-y-2 pl-6 text-[17px] leading-8 text-slate-700 marker:font-bold marker:text-emerald-700">{children}</ol>
        ),
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paragraph.push(lines[i].trim());
      i++;
    }
    if (paragraph.length === 0) { i++; continue; }
    nodes.push(
      <p key={key} className="my-5 text-[17px] leading-8 text-slate-700">{inline(paragraph.join(" "), key)}</p>,
    );
  }

  return { nodes, headings };
}
