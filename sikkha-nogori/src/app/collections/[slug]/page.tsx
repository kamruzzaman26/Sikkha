import type { Metadata } from "next";
import { ListingPage, listingMetadata } from "@/components/listing-page";

export function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  return listingMetadata("collection", params);
}

export default function Page({ params }: PageProps<"/collections/[slug]">) {
  return <ListingPage kind="collection" params={params} />;
}
