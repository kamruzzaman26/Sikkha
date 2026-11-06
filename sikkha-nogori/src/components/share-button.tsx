"use client";

import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState("");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("লিংক কপি হয়েছে");
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      setMessage("শেয়ার করা যায়নি");
    }
    window.setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div>
      <button type="button" onClick={share} className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 px-2 text-sm font-medium text-slate-700 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
        <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4" /></svg>
        শেয়ার
      </button>
      <p role="status" className="text-center text-xs text-emerald-700">{message}</p>
    </div>
  );
}
