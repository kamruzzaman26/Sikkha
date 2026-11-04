import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart-page-client";
export const metadata: Metadata = { title:"আমার কার্ট | শিক্ষা নগরী", robots:{index:false,follow:false} };
export default function CartPage(){return <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8"><div className="mx-auto max-w-4xl"><p className="font-bold text-emerald-700">Shopping cart</p><h1 className="mt-2 text-3xl font-extrabold">আমার কার্ট</h1><p className="mt-2 text-slate-600">আপনার পছন্দের পণ্যগুলো এখানে একসঙ্গে পরিচালনা করুন।</p><CartPageClient/></div></main>}
