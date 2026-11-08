"use client";

import type { ButtonHTMLAttributes } from "react";

export function AdminCloseDetailsButton({
  className,
  children = "Close",
}: Pick<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.currentTarget.closest("details")?.removeAttribute("open");
      }}
      className={className}
    >
      {children}
    </button>
  );
}
