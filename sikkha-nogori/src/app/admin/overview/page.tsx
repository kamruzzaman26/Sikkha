import { redirect } from "next/navigation";

// The admin dashboard lives at /admin/dashboard; keep the old URL working.
export default function AdminOverviewRedirect() {
  redirect("/admin/dashboard");
}
