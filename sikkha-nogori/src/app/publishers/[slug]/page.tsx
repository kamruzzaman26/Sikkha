import type { Metadata } from "next";
import { EntityProfilePage, entityMetadata } from "@/components/entity-profile-page";

export function generateMetadata({ params }: PageProps<"/publishers/[slug]">): Promise<Metadata> {
  return entityMetadata("publishers", params);
}

export default function Page({ params, searchParams }: PageProps<"/publishers/[slug]">) {
  return <EntityProfilePage kind="publishers" params={params} searchParams={searchParams} />;
}
