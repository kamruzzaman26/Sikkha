"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function AdminAutoDraftForm({
  draftKey,
  action,
  children,
  className,
}: {
  draftKey: string;
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const storageKey = `sikkha-admin-draft:${draftKey}`;

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams(window.location.search);
    if (["product-created", "product-updated"].includes(params.get("status") ?? "")) {
      localStorage.removeItem(storageKey);
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const values = JSON.parse(saved) as Record<string, string | boolean>;
        for (const element of Array.from(form.elements)) {
          if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) continue;
          if (!element.name || ["hidden", "file", "password", "submit", "button"].includes(element.type)) continue;
          const value = values[element.name];
          if (value === undefined) continue;
          if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) {
            element.checked = Boolean(value);
          } else if (typeof value === "string") {
            element.value = value;
          }
        }
      }
    } catch { localStorage.removeItem(storageKey); }
  }, [storageKey]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    let timeout: ReturnType<typeof setTimeout>;
    const save = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const values: Record<string, string | boolean> = {};
        for (const element of Array.from(form.elements)) {
          if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) continue;
          if (!element.name || ["hidden", "file", "password", "submit", "button"].includes(element.type)) continue;
          if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) {
            if (element.type === "radio" && !element.checked) continue;
            values[element.name] = element.checked;
          } else values[element.name] = element.value;
        }
        try { localStorage.setItem(storageKey, JSON.stringify(values)); } catch { /* storage may be unavailable */ }
      }, 600);
    };
    form.addEventListener("input", save);
    form.addEventListener("change", save);
    return () => { clearTimeout(timeout); form.removeEventListener("input", save); form.removeEventListener("change", save); };
  }, [storageKey]);

  return <form ref={formRef} action={action} className={className}>
    <p className="mb-1 text-xs font-medium text-brand-700" aria-live="polite">Auto Draft: তথ্য এই ব্রাউজারে স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।</p>
    {children}
  </form>;
}
