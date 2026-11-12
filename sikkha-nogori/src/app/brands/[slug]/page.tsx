import type { Metadata } from "next";
import { EntityProfilePage, entityMetadata } from "@/components/entity-profile-page";

export function generateMetadata({ params }: PageProps<"/brands/[slug]">): Promise<Metadata> {
  return entityMetadata("brands", params);
}

export default function Page({ params, searchParams }: PageProps<"/brands/[slug]">) {
  return <EntityProfilePage kind="brands" params={params} searchParams={searchParams} />;
}
