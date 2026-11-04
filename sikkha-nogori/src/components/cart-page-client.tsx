"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { readCart, writeCart, type CartLine } from "@/lib/cart";
import { formatBDT } from "@/lib/money";
type Product = { id:string; title:string; slug:string; price:number|null; image_url:string|null; commerce_mode:string|null; product_type:string };
export function CartPageClient() {
 const [items,setItems]=useState<CartLine[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  const current=readCart(); setItems(current);
  if(!current.length){setProducts([]);setLoading(false);return;}
  setLoading(true);
  const supabase=createSupabaseBrowserClient();
  const {data,error}=await supabase.from("products").select("id,title,slug,price,image_url,commerce_mode,product_type").in("id",current.map(x=>x.productId)).eq("is_published",true).is("archived_at",null).eq("commerce_mode","direct");
  if(error){setError("কার্টের পণ্য লোড করা যায়নি। আবার চেষ্টা করুন।");setLoading(false);return;}
  const valid=(data??[]) as Product[];
  setProducts(valid);
  const validIds=new Set(valid.map(p=>p.id));
  const cleaned=current.filter(x=>validIds.has(x.productId));
  if(cleaned.length!==current.length)writeCart(cleaned);
  setItems(cleaned);setLoading(false);
 },[]);
 useEffect(()=>{void refresh();const onChange=()=>void refresh();window.addEventListener("storage",onChange);window.addEventListener("sikkha-cart-change",onChange);return()=>{window.removeEventListener("storage",onChange);window.removeEventListener("sikkha-cart-change",onChange)}},[refresh]);
 function update(id:string,quantity:number){const next=items.map(x=>x.productId===id?{...x,quantity}:x).filter(x=>x.quantity>0);writeCart(next);setItems(next)}
 const rows=items.map(line=>({line,product:products.find(p=>p.id===line.productId)})).filter(x=>x.product);
 const total=rows.reduce((sum,x)=>sum+(x.product?.price??0)*x.line.quantity,0);
 if(loading)return <p className="mt-8 rounded-2xl bg-white p-6">কার্ট লোড হচ্ছে…</p>;
 return <section className="mt-7">
 {error&&<p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>}
 {!rows.length?<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-lg font-bold">আপনার কার্ট এখন খালি</p><p className="mt-2 text-slate-600">বই বা সরাসরি বিক্রির পণ্য বেছে কার্টে যোগ করুন।</p><Link href="/books" className="mt-5 inline-flex rounded-lg bg-emerald-700 px-5 py-3 font-bold text-white">বই দেখুন</Link></div>:<>
 <div className="grid gap-3">{rows.map(({line,product})=><article key={line.productId} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
 {product!.image_url?<Image src={product!.image_url} alt={product!.title} width={72} height={90} unoptimized className="h-20 w-16 rounded-lg object-contain"/>:<div className="h-20 w-16 rounded-lg bg-emerald-50"/>}
 <div className="min-w-0 flex-1"><Link href={`/products/${product!.slug}`} className="font-bold hover:text-emerald-800">{product!.title}</Link><p className="mt-1 text-sm text-slate-600">{product!.price===null?"মূল্য নির্ধারিত নয়":formatBDT(product!.price)}</p></div>
 <div className="flex items-center gap-2"><button aria-label="পরিমাণ কমান" onClick={()=>update(line.productId,line.quantity-1)} className="size-9 rounded-lg border">−</button><span className="min-w-6 text-center font-bold">{line.quantity}</span><button aria-label="পরিমাণ বাড়ান" onClick={()=>update(line.productId,Math.min(99,line.quantity+1))} className="size-9 rounded-lg border">+</button></div>
 <button onClick={()=>update(line.productId,0)} className="text-sm font-semibold text-rose-700">সরান</button>
 </article>)}</div>
 <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-emerald-50 p-5"><div><p className="text-sm text-emerald-900">মোট (আনুমানিক)</p><p className="text-2xl font-extrabold text-emerald-900">{formatBDT(total)}</p><p className="mt-1 text-xs text-emerald-800">চূড়ান্ত মূল্য Checkout-এ সার্ভার যাচাই করবে।</p></div><Link href={`/checkout?products=${encodeURIComponent(rows.map(x=>x.line.productId).join(","))}&quantities=${encodeURIComponent(rows.map(x=>x.line.productId+":"+x.line.quantity).join(","))}`} className="inline-flex min-h-12 items-center rounded-lg bg-emerald-700 px-6 py-3 font-bold text-white">Checkout-এ যান</Link></div>
 </>}
 </section>
}
