import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBooks, getPublishedCourses } from "@/lib/catalog";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { formatPrice } from "@/lib/books";
export const metadata: Metadata = {title:"E-Library | শিক্ষা নগরী",description:"শিক্ষা নগরীর প্রকাশিত বই ও অনলাইন কোর্সের ডিজিটাল ক্যাটালগ।"};
export default async function ELibraryPage(){
 const [bookPage,courses]=await Promise.all([getPublishedBooks({page:1,query:"",sort:"newest",pageSize:24}),getPublishedCourses()]);
 const books=bookPage?.products??[];
 const items=[...books,...(courses??[])];
 return <main className="min-h-screen bg-[#f7faf8] px-5 py-10 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl"><Link href="/" className="font-semibold text-emerald-700">← হোম</Link><header className="mt-7 rounded-3xl bg-[#083b32] p-7 text-white sm:p-10"><p className="text-sm font-bold text-emerald-200">DIGITAL LEARNING</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">E-Library</h1><p className="mt-3 max-w-2xl leading-7 text-emerald-50">প্রকাশিত বই ও অনলাইন কোর্সের ক্যাটালগ এক জায়গায় দেখুন। প্রতিটি আইটেমের বিস্তারিত পেজে উপলভ্য ক্রয় বা কোর্স-অ্যাক্সেসের তথ্য থাকবে।</p></header>{bookPage===null||courses===null?<p className="mt-7 rounded-xl bg-amber-50 p-5 text-amber-950">লাইব্রেরির ডেটাবেস এখনো প্রস্তুত নয়।</p>:items.length===0?<p className="mt-7 rounded-2xl border border-dashed bg-white p-10 text-center text-slate-600">এখনো কোনো বই বা কোর্স প্রকাশিত হয়নি।</p>:<section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{items.map(product=><CatalogProductCard key={product.id} product={product}/>)}</section>}</div></main>
}
