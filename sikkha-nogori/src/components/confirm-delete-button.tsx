"use client";

import { useFormStatus } from "react-dom";

export function ConfirmDeleteButton({ message, children = "Delete" }: { message: string; children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
    >
      {pending ? "Deleting…" : children}
    </button>
  );
}
