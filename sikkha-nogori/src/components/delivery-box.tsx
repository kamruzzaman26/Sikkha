"use client";

import { useState } from "react";

export function DeliveryBox({ inside, outside, note }: { inside: string; outside: string; note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start gap-3 pr-8">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0 text-blue-700" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></svg>
        <div className="text-sm leading-6 text-slate-700">
          <p className="font-bold text-blue-700">সম্ভাব্য ডেলিভারি</p>
          <p>ঢাকার ভেতরে : <span className="font-semibold text-slate-900">{inside}</span> এবং,</p>
          <p>ঢাকার বাইরে : <span className="font-semibold text-slate-900">{outside}ের</span> মধ্যে পৌঁছাবে, ইনশাআল্লাহ।</p>
        </div>
      </div>
      {note && (
        <>
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="ডেলিভারি সম্পর্কে আরও তথ্য" className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">i</button>
          {open && <p role="note" className="mt-2 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">{note}</p>}
        </>
      )}
    </div>
  );
}
