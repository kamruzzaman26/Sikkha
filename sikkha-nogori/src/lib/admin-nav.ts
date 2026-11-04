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
      { label: "Products", icon: "products", href: "/admin" },
      { label: "Categories", icon: "categories", href: "/admin/categories" },
      { label: "Orders", icon: "orders", href: "/admin/orders" },
      { label: "Customers", icon: "customers", href: "/admin/users" },
      { label: "Payments", icon: "payments", href: "/admin/payments" },
      { label: "Inventory", icon: "inventory" },
    ],
  },
  {
    title: "Website Control",
    items: [
      { label: "Homepage Builder", icon: "homepage" },
      { label: "Banners", icon: "banners" },
      { label: "Navigation", icon: "navigation" },
      { label: "Pages", icon: "pages" },
      { label: "Blog", icon: "blog" },
      { label: "Marketing", icon: "marketing" },
      { label: "SEO", icon: "seo" },
      { label: "Media Library", icon: "media" },
    ],
  },
  {
    title: "System Administration",
    items: [
      { label: "Affiliates", icon: "affiliates", href: "/admin/affiliates" },
      { label: "Roles & Permissions", icon: "roles", href: "/admin/roles" },
      { label: "Activity Logs", icon: "logs", href: "/admin/logs" },
      { label: "Website Settings", icon: "settings" },
      { label: "Reports", icon: "reports" },
    ],
  },
];
