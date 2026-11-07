import type { ReactNode } from "react";
import { Toaster } from "@/components/toaster";

export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="site-header-slot">{header}</div>
      {children}
      <Toaster />
      <div className="site-footer-slot">{footer}</div>
    </>
  );
}
