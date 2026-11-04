import type { AdminIconName } from "@/components/admin-icons";

export type AdminNavItem = {
  label: string;
  icon: AdminIconName;
  href?: string;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

// Items without href are intentionally disabled until their pages exist.
export const adminNav: AdminNavGroup[] = [
  {
    title: "Daily Operations",
    items: [
      { label: "Dashboard", icon: "dashboard", href: "/admin/dashboard" },
      { label: "Products & Affiliate Links", icon: "products", href: "/admin" },
      { label: "Categories", icon: "categories", href: "/admin/categories" },
      { label: "Orders", icon: "orders", href: "/admin/orders" },
      { label: "Customers", icon: "customers", href: "/admin/users" },
      { label: "Payments", icon: "payments", href: "/admin/payments" },
      { label: "Inventory", icon: "inventory", href: "/admin/inventory" },
    ],
  },
  {
    title: "Website Control",
    items: [
      { label: "Homepage Builder", icon: "homepage", href: "/admin/homepage" },
      { label: "Banners", icon: "banners", href: "/admin/banners" },
      { label: "Navigation", icon: "navigation", href: "/admin/navigation" },
      { label: "Pages", icon: "pages", href: "/admin/pages" },
      { label: "Blog", icon: "blog", href: "/admin/blog" },
      { label: "Marketing", icon: "marketing", href: "/admin/marketing" },
      { label: "SEO", icon: "seo", href: "/admin/seo" },
      { label: "Media Library", icon: "media", href: "/admin/media" },
    ],
  },
  {
    title: "System Administration",
    items: [
      { label: "Affiliates", icon: "affiliates", href: "/admin/affiliates" },
      { label: "Roles & Permissions", icon: "roles", href: "/admin/roles" },
      { label: "Activity Logs", icon: "logs", href: "/admin/logs" },
      { label: "Website Settings", icon: "settings", href: "/admin/settings" },
      { label: "Reports", icon: "reports", href: "/admin/reports" },
    ],
  },
];
