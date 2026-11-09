"use client";

import { useState } from "react";

const btn = "inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800";

export function ShareLinks({ url, title }: { url?: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const target = () => url ?? window.location.href;
  const open = (build: (u: string, t: string) => string) => {
    window.open(build(encodeURIComponent(target()), encodeURIComponent(title)), "_blank", "noopener,noreferrer");
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btn} onClick={() => open((u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`)}>Facebook</button>
      <button type="button" className={btn} onClick={() => open((u, t) => `https://wa.me/?text=${t}%20${u}`)}>WhatsApp</button>
      <button
        type="button"
        className={btn}
        onClick={async () => {
          try { await navigator.clipboard.writeText(target()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
        }}
      >
        {copied ? "কপি হয়েছে ✓" : "লিংক কপি"}
      </button>
    </div>
  );
}
