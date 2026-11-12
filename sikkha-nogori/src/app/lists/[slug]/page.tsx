import type { Metadata } from "next";
import { ListingPage, listingMetadata } from "@/components/listing-page";

export function generateMetadata({ params }: PageProps<"/lists/[slug]">): Promise<Metadata> {
  return listingMetadata("list", params);
}

export default function Page({ params }: PageProps<"/lists/[slug]">) {
  return <ListingPage kind="list" params={params} />;
}
