export type AdminNavItem = {
  label: string;
  href?: string; // no href = not implemented yet (shown as "শীঘ্রই")
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

// Source of truth for the admin sidebar. Items without `href` are planned
// features and are rendered disabled; nothing here links to a fake page.
export const adminNav: AdminNavGroup[] = [
  {
    title: "Daily Operations",
    items: [
      { label: "Dashboard", href: "/admin/dashboard" },
      { label: "Products / পণ্য", href: "/admin" },
      { label: "ক্যাটাগরি ব্যবস্থাপনা" },
      { label: "Orders / অর্ডার", href: "/admin/orders" },
      { label: "Customers / গ্রাহক", href: "/admin/users" },
      { label: "Payments / পেমেন্ট", href: "/admin/payments" },
      { label: "Inventory / স্টক" },
    ],
  },
  {
    title: "Website Control",
    items: [
      { label: "Homepage Builder" },
      { label: "Banners" },
      { label: "Navigation" },
      { label: "Pages" },
      { label: "Blog" },
      { label: "Marketing" },
      { label: "SEO" },
      { label: "Media Library" },
    ],
  },
  {
    title: "System Administration",
    items: [
      { label: "Affiliates", href: "/admin/affiliates" },
      { label: "Roles & Permissions" },
      { label: "Activity Logs" },
      { label: "Website Settings" },
      { label: "Reports" },
    ],
  },
];
