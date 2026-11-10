"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ProductImageUpload({ initialUrl = "", idPrefix }: { initialUrl?: string; idPrefix: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("JPG, PNG বা WebP ছবি দিন (সর্বোচ্চ ৫ MB)।");
      return;
    }
    setBusy(true); setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `catalog/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ছবি আপলোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally { setBusy(false); }
  }

  return <div className="grid gap-3">
    <label htmlFor={`${idPrefix}-image-file`} className="block text-sm font-semibold text-slate-700">Cover / Product Image</label>
    <div className="flex flex-wrap items-center gap-3">
      {url ? <Image src={url} alt="Product cover preview" width={80} height={96} unoptimized className="h-24 w-20 rounded-lg border border-slate-200 object-cover" /> : <div className="flex h-24 w-20 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">No image</div>}
      <div className="min-w-0 flex-1">
        <input ref={inputRef} id={`${idPrefix}-image-file`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-800" />
        <p className="mt-1 text-xs text-slate-500">{busy ? "ছবি আপলোড হচ্ছে…" : "JPG, PNG বা WebP · সর্বোচ্চ ৫ MB"}</p>
        {error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
      </div>
    </div>
    <label htmlFor={`${idPrefix}-image-url`} className="text-xs font-semibold text-slate-600">অথবা HTTPS Image URL দিন</label>
    <input id={`${idPrefix}-image-url`} name="imageUrl" type="url" inputMode="url" maxLength={2048} value={url} onChange={(e) => setUrl(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
  </div>;
}
