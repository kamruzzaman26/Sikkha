import type { Metadata } from "next";
import { connection } from "next/server";
import {
  saveCatalogEntity,
  setCatalogEntityStatus,
} from "../actions";
import { requirePermission } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Catalog Entities | Sikkha Nogori",
  robots: { index: false, follow: false },
};

type EntityKind = "authors" | "publishers" | "brands" | "creators";
type EntityRecord = {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  is_active: boolean;
  biography?: string | null;
  image_url?: string | null;
  description?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  creator_type?: string;
  profile_image_url?: string | null;
};

const sections: Array<{ kind: EntityKind; title: string; description: string }> = [
  { kind: "authors", title: "Authors", description: "Book authors and editors." },
  { kind: "publishers", title: "Publishers", description: "Publishing houses and imprints." },
  { kind: "brands", title: "Brands", description: "Brands for physical and digital products." },
  { kind: "creators", title: "Creators & Instructors", description: "Course instructors and other content creators." },
];

function EntityForm({
  kind,
  entity,
}: {
  kind: EntityKind;
  entity?: EntityRecord;
}) {
  const imageValue =
    kind === "authors"
      ? entity?.image_url
      : kind === "creators"
        ? entity?.profile_image_url
        : entity?.logo_url;

  return (
    <form action={saveCatalogEntity} className="grid gap-3">
      <input type="hidden" name="entityType" value={kind} />
      {entity && <input type="hidden" name="id" value={entity.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Name
          <input name="name" required maxLength={160} defaultValue={entity?.name ?? ""} className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          English name (optional)
          <input name="nameEn" maxLength={160} defaultValue={entity?.name_en ?? ""} className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        URL slug
        <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={160} defaultValue={entity?.slug ?? ""} placeholder="example-name" className="min-h-11 rounded-lg border border-slate-300 px-3 font-mono font-normal" />
      </label>
      {kind === "creators" && (
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Creator type
          <select name="creatorType" defaultValue={entity?.creator_type ?? "other"} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal">
            <option value="instructor">Instructor</option>
            <option value="author">Author</option>
            <option value="content_creator">Content Creator</option>
            <option value="artist">Artist</option>
            <option value="other">Other</option>
          </select>
        </label>
      )}
      {(kind === "authors" || kind === "creators") && (
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Biography (optional)
          <textarea name="biography" maxLength={5000} rows={3} defaultValue={entity?.biography ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" />
        </label>
      )}
      {(kind === "publishers" || kind === "brands") && (
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Description (optional)
          <textarea name="description" maxLength={5000} rows={3} defaultValue={entity?.description ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" />
        </label>
      )}
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        {kind === "authors" ? "Image URL" : kind === "creators" ? "Profile image URL" : "Logo URL"} (optional)
        <input name="imageUrl" type="url" maxLength={2048} defaultValue={imageValue ?? ""} className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" />
      </label>
      {(kind === "publishers" || kind === "brands" || kind === "creators") && (
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Website URL (optional)
          <input name="websiteUrl" type="url" maxLength={2048} defaultValue={entity?.website_url ?? ""} className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" />
        </label>
      )}
      <button type="submit" className="min-h-11 w-fit rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800">
        {entity ? "Save changes" : `Add ${sections.find((section) => section.kind === kind)?.title}`}
      </button>
    </form>
  );
}

export default async function CatalogEntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await connection();
  const { supabase } = await requirePermission("manage_products");
  const db = supabase as unknown as { from: (table: string) => any };
  const [authors, publishers, brands, creators] = await Promise.all([
    db.from("authors").select("*").order("name"),
    db.from("publishers").select("*").order("name"),
    db.from("brands").select("*").order("name"),
    db.from("creators").select("*").order("name"),
  ]);

  for (const result of [authors, publishers, brands, creators]) {
    if (result.error) throw new Error("Unable to load catalog entities.", { cause: result.error });
  }

  const data: Record<EntityKind, EntityRecord[]> = {
    authors: authors.data ?? [],
    publishers: publishers.data ?? [],
    brands: brands.data ?? [],
    creators: creators.data ?? [],
  };
  const params = await searchParams;
  const statusValue = Array.isArray(params.status) ? params.status[0] : params.status;
  const message =
    statusValue === "saved" ? "Catalog entity saved." :
    statusValue === "exists" ? "That URL slug is already in use." :
    statusValue === "invalid" ? "Please check the form values and try again." :
    statusValue === "not-found" ? "The selected entity was not found." : null;

  return (
    <main className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-slate-900 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-800">Catalog Management</p>
            <h1 className="mt-1 text-3xl font-bold">Authors, Publishers, Brands & Creators</h1>
            <p className="mt-2 text-sm text-slate-600">Manage reusable catalog entities. Existing product text fields remain unchanged.</p>
          </div>
          <a href="/admin" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Back to Products</a>
        </header>
        {message && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</p>}
        <div className="grid gap-5">
          {sections.map((section) => (
            <section key={section.kind} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold">{section.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{section.description} · {data[section.kind].length} total</p>
                </div>
              </div>
              <details className="mb-4 rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand-800">Add new {section.title.replace(/s$/, "")}</summary>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <EntityForm kind={section.kind} />
                </div>
              </details>
              {data[section.kind].length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No entries yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data[section.kind].map((entity) => (
                    <li key={entity.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{entity.name}</p>
                          <p className="mt-0.5 break-all text-xs text-slate-500">{entity.slug}</p>
                        </div>
                        <span className={entity.is_active ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"}>{entity.is_active ? "Active" : "Inactive"}</span>
                      </div>
                      <details className="mt-3 rounded-xl border border-slate-200 p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-brand-800">Edit details</summary>
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <EntityForm kind={section.kind} entity={entity} />
                        </div>
                      </details>
                      <form action={setCatalogEntityStatus} className="mt-2">
                        <input type="hidden" name="entityType" value={section.kind} />
                        <input type="hidden" name="id" value={entity.id} />
                        <input type="hidden" name="isActive" value={entity.is_active ? "false" : "true"} />
                        <button type="submit" className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700">{entity.is_active ? "Deactivate" : "Activate"}</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
