"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TOAST_EVENT, type ToastDetail } from "@/lib/toast";

export function Toaster() {
  const [toast, setToast] = useState<(ToastDetail & { id: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      window.clearTimeout(timer.current);
      setToast({ ...detail, id: Date.now() });
      timer.current = window.setTimeout(() => setToast(null), 3200);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;
  const tone = toast.tone ?? "success";
  const color = tone === "error" ? "bg-rose-700" : tone === "info" ? "bg-slate-800" : "bg-emerald-700";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 sm:bottom-8">
      <div role={tone === "error" ? "alert" : "status"} key={toast.id} className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-full ${color} px-4 py-2.5 text-sm font-semibold text-white shadow-lg`}>
        <span aria-hidden="true">{tone === "error" ? "!" : "✓"}</span>
        <span>{toast.message}</span>
        {toast.href && <Link href={toast.href} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold hover:bg-white/30">{toast.actionLabel ?? "View"}</Link>}
      </div>
    </div>
  );
}
