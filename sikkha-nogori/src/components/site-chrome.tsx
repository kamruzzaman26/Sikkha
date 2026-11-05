import type { ReactNode } from "react";

export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="site-header-slot">{header}</div>
      {children}
      <div className="site-footer-slot">{footer}</div>
    </>
  );
}
