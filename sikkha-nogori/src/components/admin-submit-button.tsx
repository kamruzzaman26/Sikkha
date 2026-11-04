"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function AdminSubmitButton({ children, pendingLabel = "Saving…", className }: { children: ReactNode; pendingLabel?: string; className: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-disabled={pending} className={className + (pending ? " cursor-wait opacity-70" : "")}>
    {pending ? pendingLabel : children}
  </button>;
}
