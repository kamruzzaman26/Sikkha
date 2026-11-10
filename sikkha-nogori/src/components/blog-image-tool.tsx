"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Ratio = "original" | "16:9" | "4:3" | "1:1" | "3:2";
const RATIOS: Record<Exclude<Ratio, "original">, number> = { "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "3:2": 3 / 2 };

function gcdLabel(w: number, h: number) {
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const d = g(w, h);
  return `${w / d}:${h / d}`;
}

function nearestRatio(w: number, h: number) {
  const r = w / h;
  const best = Object.entries(RATIOS).sort((a, b) => Math.abs(a[1] - r) - Math.abs(b[1] - r))[0];
  return Math.abs(best[1] - r) < 0.03 ? best[0] : gcdLabel(w, h).length > 7 ? `${r.toFixed(2)}:1` : gcdLabel(w, h);
}

async function processImage(file: File, ratio: Ratio, maxWidth: number): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (ratio !== "original") {
    const target = RATIOS[ratio];
    if (sw / sh > target) { sw = Math.round(sh * target); sx = Math.round((bitmap.width - sw) / 2); }
    else { sh = Math.round(sw / target); sy = Math.round((bitmap.height - sh) / 2); }
  }
  const scale = Math.min(1, maxWidth / sw);
  const width = Math.round(sw * scale), height = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not process the image."))), "image/webp", 0.86));
  return { blob, width, height };
}

const field = "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10";
const lab = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600";

export function BlogImageTool({ onInsert, onCover }: { onInsert: (markdown: string) => void; onCover: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [ratio, setRatio] = useState<Ratio>("original");
  const [maxWidth, setMaxWidth] = useState(1400);
  const [alt, setAlt] = useState("");
  const [align, setAlign] = useState("center");
  const [size, setSize] = useState("lg");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function pick(f?: File) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 8 * 1024 * 1024) {
      setMsg({ ok: false, text: "Choose a JPG, PNG or WebP image up to 8 MB." });
      return;
    }
    setMsg(null); setFile(f); setUrl("");
    const u = URL.createObjectURL(f);
    setPreview(u);
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = u;
  }

  async function upload(): Promise<string | null> {
    if (url) return url;
    if (!file) { setMsg({ ok: false, text: "Choose an image first." }); return null; }
    setBusy(true); setMsg(null);
    try {
      const { blob } = await processImage(file, ratio, maxWidth);
      const path = `blog/${crypto.randomUUID()}.webp`;
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
      if (error) throw new Error(error.message);
      const publicUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      setUrl(publicUrl);
      setMsg({ ok: true, text: "Uploaded." });
      return publicUrl;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed." });
      return null;
    } finally { setBusy(false); }
  }

  async function insert() {
    const u = await upload();
    if (!u) return;
    const safeAlt = alt.replace(/[\[\]\n]/g, " ").trim();
    onInsert(`\n\n![${safeAlt}](${u}){align=${align} size=${size}}\n\n`);
    setMsg({ ok: true, text: "Inserted into the article at the cursor." });
  }
  async function useCover() {
    const u = await upload();
    if (u) { onCover(u); setMsg({ ok: true, text: "Set as cover image." }); }
  }

  const shownRatio = ratio === "original" ? (natural ? nearestRatio(natural.w, natural.h) : "—") : ratio;

  return (
    <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50/70">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-10 w-full items-center justify-between px-3 text-left text-xs font-bold text-slate-700">
        <span>📷 Upload &amp; insert image</span><span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700">
              Choose image
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {preview ? (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className={`w-full rounded-lg border border-slate-200 bg-white ${ratio === "original" ? "max-h-64 object-contain" : "object-cover"}`} style={ratio === "original" ? undefined : { aspectRatio: String(RATIOS[ratio]) }} />
                <p className="mt-1.5 text-xs text-slate-600">
                  {natural ? `Original ${natural.w}×${natural.h}px · ` : ""}Aspect ratio <b className="rounded bg-white px-1.5 py-0.5 ring-1 ring-slate-200">{shownRatio}</b>
                </p>
              </div>
            ) : <p className="mt-3 text-xs text-slate-500">JPG, PNG or WebP, up to 8 MB. It is cropped/resized in your browser and saved as WebP.</p>}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lab} htmlFor="bi-ratio">Crop to ratio</label>
                <select id="bi-ratio" className={field} value={ratio} onChange={(e) => { setRatio(e.target.value as Ratio); setUrl(""); }}>
                  <option value="original">Original</option><option>16:9</option><option>4:3</option><option>1:1</option><option>3:2</option>
                </select></div>
              <div><label className={lab} htmlFor="bi-max">Max width</label>
                <select id="bi-max" className={field} value={maxWidth} onChange={(e) => { setMaxWidth(Number(e.target.value)); setUrl(""); }}>
                  <option value={800}>800 px</option><option value={1200}>1200 px</option><option value={1400}>1400 px</option><option value={1920}>1920 px</option>
                </select></div>
              <div><label className={lab} htmlFor="bi-align">Alignment</label>
                <select id="bi-align" className={field} value={align} onChange={(e) => setAlign(e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
              <div><label className={lab} htmlFor="bi-size">Display size</label>
                <select id="bi-size" className={field} value={size} onChange={(e) => setSize(e.target.value)}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option><option value="full">Full width</option></select></div>
            </div>
            <div><label className={lab} htmlFor="bi-alt">Alt text (describe the image)</label><input id="bi-alt" className={field} value={alt} maxLength={140} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Students reading in the library" /></div>
            <div><label className={lab} htmlFor="bi-url">…or paste an image URL</label><input id="bi-url" className={field} type="url" value={url} onChange={(e) => { setUrl(e.target.value); setPreview(e.target.value); setNatural(null); setFile(null); }} placeholder="https://…" /></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={insert} className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700">{busy ? "Working…" : "Insert in article"}</button>
              <button type="button" disabled={busy} onClick={useCover} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Use as cover</button>
            </div>
            {msg && <p role="status" className={`text-xs font-semibold ${msg.ok ? "text-green-700" : "text-rose-700"}`}>{msg.ok ? "✓ " : ""}{msg.text}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
