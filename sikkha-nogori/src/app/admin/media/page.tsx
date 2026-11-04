import type { Metadata } from "next";
import { connection } from "next/server";
import { requirePermission } from "@/lib/supabase/admin";
import { AdminMediaLibrary } from "@/components/admin-media-library";
export const metadata: Metadata = { title: "Media Library | Sikkha Nogori Admin", robots: { index: false, follow: false } };
export default async function MediaLibraryPage() {
 await connection();
 const {supabase}=await requirePermission("manage_media","/admin/dashboard");
 const {data,error}=await supabase.storage.from("product-images").list("catalog",{limit:200,sortBy:{column:"created_at",order:"desc"}});
 if(error) throw new Error("Unable to load media library.",{cause:error});
 const files=(data??[]).filter(file=>file.name&&!file.name.endsWith("/")).map(file=>({name:file.name,id:file.id??undefined,created_at:file.created_at??undefined,metadata:file.metadata??undefined}));
 return <main lang="en" className="min-h-screen px-4 py-7 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl"><header className="rounded-3xl bg-[#082f29] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Website assets</p><h1 className="mt-2 text-3xl font-black">Media Library</h1><p className="mt-2 text-sm text-emerald-50/75">Manage product and catalog images stored in Supabase Storage.</p></header><AdminMediaLibrary initialFiles={files}/></div></main>;
}
