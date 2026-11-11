import type { Metadata } from "next";
import { EntityProfilePage, entityMetadata } from "@/components/entity-profile-page";

export function generateMetadata({ params }: PageProps<"/authors/[slug]">): Promise<Metadata> {
  return entityMetadata("authors", params);
}

export default function Page({ params, searchParams }: PageProps<"/authors/[slug]">) {
  return <EntityProfilePage kind="authors" params={params} searchParams={searchParams} />;
}
