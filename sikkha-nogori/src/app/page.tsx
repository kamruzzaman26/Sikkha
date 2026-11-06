import { Suspense } from "react";
import HomeContent from "@/components/home-content";

export default function Home({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  return (
    <Suspense
      fallback={<div className="min-h-screen animate-pulse bg-[#f7faf8]" />}
    >
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}
