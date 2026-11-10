import type { ReactNode } from "react";

// Inline SVG icons for the admin panel; no additional package is required.
export type AdminIconName =
  | "dashboard" | "products" | "categories" | "orders" | "customers"
  | "payments" | "inventory" | "homepage" | "banners" | "navigation"
  | "pages" | "blog" | "marketing" | "seo" | "media" | "affiliates"
  | "roles" | "logs" | "settings" | "reports" | "save" | "edit"
  | "delete" | "upload" | "search" | "filter" | "add" | "view"
  | "external" | "menu" | "chevron" | "bell" | "x" | "wallet" | "handshake" | "receipt" | "chart" | "spreadsheet";

const paths: Record<AdminIconName, ReactNode> = {
  dashboard: <><rect x="3.5" y="3.5" width="7" height="8" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="5" rx="1.5" /><rect x="13.5" y="11.5" width="7" height="9" rx="1.5" /><rect x="3.5" y="14.5" width="7" height="6" rx="1.5" /></>,
  products: <><path d="M4 5.5c2.7-1.2 5.3-1.2 8 0v13c-2.7-1.2-5.3-1.2-8 0v-13Z" /><path d="M20 5.5c-2.7-1.2-5.3-1.2-8 0v13c2.7-1.2 5.3-1.2 8 0v-13Z" /></>,
  categories: <><path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-10.5Z" /><path d="M8 13h8M8 16h5" /></>,
  orders: <><path d="M5.5 8h13l-1 11.5h-11L5.5 8Z" /><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" /></>,
  customers: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.4-3.2 2.7-5 5.5-5s5.1 1.8 5.5 5" /><path d="M15.5 5.8a3 3 0 0 1 0 5.4M17.5 14.4c1.7.6 2.8 2.1 3 4.6" /></>,
  payments: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  inventory: <><path d="m12 3.5 8 4v9l-8 4-8-4v-9l8-4Z" /><path d="m4 7.5 8 4 8-4M12 11.5v9" /></>,
  homepage: <><path d="M4 11 12 4l8 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></>,
  banners: <><rect x="3" y="5" width="18" height="11" rx="2" /><path d="m3.5 13.5 4-3.5 4 3 3-2.5 6 4.5" /><circle cx="16.5" cy="8.8" r="1.1" /><path d="M9 19.5h6" /></>,
  navigation: <><path d="M4 6.5h16M4 12h16M4 17.5h10" /><path d="m17.5 15.5 2 2-2 2" /></>,
  pages: <><path d="M6 3.5h8.5L19 8v12.5H6v-17Z" /><path d="M14 3.5V8.5h5M9 12.5h7M9 16h5" /></>,
  blog: <><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m13.5 8 3 3M12 20h8" /></>,
  marketing: <><path d="M4 10v4a1 1 0 0 0 1 1h2.5l8 4V5l-8 4H5a1 1 0 0 0-1 1Z" /><path d="M7.5 15 9 20h2.5M19 9.5a3.5 3.5 0 0 1 0 5" /></>,
  seo: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /><path d="m7.5 12.5 2.2-2.2 1.6 1.4 2.4-2.9" /></>,
  media: <><rect x="3" y="4.5" width="18" height="15" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m3.5 17 5-4.5 3.5 3 3-2.5 5.5 4.5" /></>,
  affiliates: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l-1-1" /></>,
  roles: <><path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-2.5Z" /><circle cx="12" cy="10.5" r="1.8" /><path d="M12 12.3v3.2m0-1.2h1.4" /></>,
  logs: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" /></>,
  reports: <><path d="M4 20V4.5M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  save: <><path d="M5 4h11l3.5 3.5V20H5V4Z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>,
  edit: <><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m13.5 8 3 3" /></>,
  delete: <><path d="M5 7h14M10 7V4.5h4V7" /><path d="m6.5 7 .8 12.5h9.4L17.5 7M10 11v5m4-5v5" /></>,
  upload: <><path d="M12 16V4.5m0 0L7.5 9M12 4.5 16.5 9" /><path d="M4.5 15v4.5h15V15" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  filter: <path d="M4 5.5h16l-6 7v6l-4-2v-4l-6-7Z" />,
  add: <path d="M12 5v14M5 12h14" />,
  view: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  external: <><path d="M14 4.5h5.5V10M19.5 4.5 11 13" /><path d="M18 14v5H5V6h5" /></>,
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="2.5" /><path d="M3 9h18M16 14h2" /><path d="M7 5V3.5h10V5" /></>,
  handshake: <><path d="m3 9 4-4 4 2 2-1 4 1 4 4-3 3-3-2-3 3-3-2-2 1-4-5Z" /><path d="m7 5 2 2m6-1 2 2M9 15l2 2m2-4 2 2" /></>,
  receipt: <><path d="M5 3.5 7 5l2-1.5L11 5l2-1.5L15 5l2-1.5 2 1.5v17l-2-1.5-2 1.5-2-1.5L11 22l-2-1.5L7 22l-2-1.5v-17Z" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
  chart: <><path d="M4 20V4M4 20h17" /><path d="m7 15 4-4 3 2 5-6" /><path d="M16 7h3v3" /></>,
  spreadsheet: <><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M3.5 9h17M3.5 14.5h17M9 3.5v17M14.5 3.5v17" /></>,
};

export function AdminIcon({ name, className = "size-5" }: { name: AdminIconName; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
