import type { Metadata } from "next";
import Link from "next/link";
import { AdminBookImport } from "@/components/admin-book-import";
import { requireAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Course Management | Sikkha Nogori",
  robots: { index: false, follow: false },
};

export default async function AdminCoursesPage() {
  await requireAdmin("admin");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/admin" className="font-semibold text-brand-700 hover:underline">Admin</Link>
          <span className="px-2" aria-hidden="true">/</span>
          <span>Courses</span>
        </nav>

        <header className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-brand-700">Daily Operations</p>
            <h1 className="mt-1 text-3xl font-extrabold">Course Management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage online courses as catalog products. Manual entry and the existing Smart Catalog import both use the same product, category, and affiliate-link rules.
            </p>
          </div>
          <Link href="/admin#product-catalog" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800">
            Add Course Manually
          </Link>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Manual Course Entry</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Open the existing catalog form, select Product Type: course, choose affiliate sales, and add the provider-approved affiliate URL.
            </p>
            <Link href="/admin#product-catalog" className="mt-4 inline-flex font-semibold text-brand-700 hover:underline">
              Open Product Catalog →
            </Link>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Bulk Course Import</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The Smart Catalog importer accepts CSV and XLSX files, validates course product types and approved affiliate domains, previews rows, detects duplicates, and saves imports as unpublished drafts.
            </p>
            <a href="/templates/course-import-template.csv" download className="mt-4 inline-flex font-semibold text-brand-700 hover:underline">
              Download CSV Template ↓
            </a>
          </article>
        </section>

        <div className="mt-6">
          <AdminBookImport />
        </div>

        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          Both CSV and XLSX uploads are supported. Use the course CSV template as the column guide; you can open it in Excel or Google Sheets and save it as .xlsx. The importer reads the first worksheet. Imported courses remain drafts and must be reviewed before publishing.
        </p>
      </div>
    </main>
  );
}
