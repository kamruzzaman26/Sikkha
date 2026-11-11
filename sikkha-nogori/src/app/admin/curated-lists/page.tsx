import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminListingManager } from "@/components/admin-listing-manager";

export const metadata: Metadata = { title: "Curated Lists | Sikkha Nogori Admin", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  return <AdminListingManager kind="curated_lists" searchParams={searchParams} />;
}
