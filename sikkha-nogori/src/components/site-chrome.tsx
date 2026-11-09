import type { ReactNode } from "react";
import { Toaster } from "@/components/toaster";

export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden bg-[#f7faf8]">
      <div className="w-full min-w-0">{header}</div>
      <div className="w-full min-w-0 flex-1 overflow-x-hidden">{children}</div>
      <Toaster />
      <div className="w-full min-w-0 pb-[calc(4.25rem+env(safe-area-inset-bottom))]">{footer}</div>
    </div>
  );
}
