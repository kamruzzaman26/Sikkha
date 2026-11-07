"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOutCustomer } from "@/app/login/actions";
import { readCart } from "@/lib/cart";

type SiteIdentity = { displayName: string; email: string; hasOrders: boolean; isAdmin: boolean } | null;
export type MenuCategory = { name: string; children: MenuCategory[] };
export type CategoryMenu = { books: MenuCategory[]; products: MenuCategory[] };
type IconName = "menu" | "search" | "heart" | "user" | "close" | "cart" | "home" | "book" | "library";

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const props = { "aria-hidden": true as const, className, fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.8, viewBox: "0 0 24 24" };
  switch (name) {
    case "menu": return <svg {...props}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    case "search": return <svg {...props}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
    case "heart": return <svg {...props}><path d="M20.2 8.8c0 4.2-8.2 10-8.2 10s-8.2-5.8-8.2-10a4.4 4.4 0 0 1 8.2-2.2 4.4 4.4 0 0 1 8.2 2.2Z" /></svg>;
    case "user": return <svg {...props}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.5 3.1-5.3 7-5.3s6.3 1.8 7 5.3" /></svg>;
    case "close": return <svg {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "cart": return <svg {...props}><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>;
    case "home": return <svg {...props}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></svg>;
    case "book": return <svg {...props}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8m-8 4h7" /></svg>;
    case "library": return <svg {...props}><path d="M4 5h16v15H4zM8 9h8m-8 4h8m-8 4h5" /></svg>;
  }
}

const iconButtonClass = "relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:size-11";

export function SiteHeader({ identity, categoryMenu = { books: [], products: [] } }: { identity: SiteIdentity; categoryMenu?: CategoryMenu }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateCart = () => setCartCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    updateCart();
    window.addEventListener("storage", updateCart);
    window.addEventListener("sikkha-cart-change", updateCart);
    return () => { window.removeEventListener("storage", updateCart); window.removeEventListener("sikkha-cart-change", updateCart); };
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setDrawerOpen(false); menuButtonRef.current?.focus(); return; }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const elements = drawerRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled])');
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements[elements.length - 1]?.focus(); }
      else if (!event.shiftKey && document.activeElement === elements[elements.length - 1]) { event.preventDefault(); elements[0]?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [drawerOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setAccountOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setAccountOpen(false); accountButtonRef.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [accountOpen]);

  return <>
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-6 lg:gap-5 lg:px-8">
        <button ref={menuButtonRef} type="button" onClick={() => setDrawerOpen(true)} aria-label="মেনু খুলুন" aria-expanded={drawerOpen} aria-controls="site-navigation-drawer" className={iconButtonClass}><Icon name="menu" /></button>
        <Link href="/" aria-label="শিক্ষা নগরী — হোম" className="hidden shrink-0 items-center gap-2 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-emerald-700 sm:flex"><span className="flex size-10 items-center justify-center rounded-xl bg-[#006b4f] font-extrabold text-white">শি</span><span className="text-base font-extrabold text-[#064b3b] lg:text-lg">শিক্ষা নগরী</span></Link>
        <form action="/books" method="get" role="search" className="min-w-0 flex-1"><label className="sr-only" htmlFor="site-search">বই, লেখক বা বিভাগ খুঁজুন</label><div className="flex min-h-11 rounded-xl border-2 border-[#2465a8] bg-white p-1 focus-within:ring-2 focus-within:ring-blue-100 sm:border-slate-200 sm:bg-[#f8faf9] sm:focus-within:border-emerald-600"><span className="flex items-center pl-1.5 text-slate-500"><Icon name="search" className="size-4 sm:size-5" /></span><input id="site-search" name="q" type="search" placeholder="বই, লেখক ও প্রকাশনী খুঁজুন" className="min-w-0 flex-1 bg-transparent px-2 text-xs text-slate-800 outline-none placeholder:text-slate-500 sm:text-sm" /><button type="submit" className="min-h-8 rounded-lg bg-[#2465a8] px-3 text-xs font-bold text-white hover:bg-[#19538f] sm:px-4 sm:text-sm">খুঁজুন</button></div></form>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1"><Link href="/wishlist" aria-label="পছন্দের তালিকা" className={`${iconButtonClass} hidden sm:inline-flex`}><Icon name="heart" /></Link><div className="relative hidden sm:block" ref={accountRef}><button ref={accountButtonRef} type="button" aria-label="অ্যাকাউন্ট" aria-expanded={accountOpen} aria-controls="account-menu" onClick={() => setAccountOpen((value) => !value)} className={iconButtonClass}><Icon name="user" /></button>{accountOpen && <div id="account-menu" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">{identity ? <><p className="border-b border-slate-100 px-3 pb-3 font-bold">{identity.displayName}</p><AccountLink href="/dashboard/profile" onClick={() => setAccountOpen(false)}>অ্যাকাউন্ট তথ্য</AccountLink><AccountLink href="/account/orders" onClick={() => setAccountOpen(false)}>অর্ডার ও ট্র্যাকিং</AccountLink><AccountLink href="/wishlist" onClick={() => setAccountOpen(false)}>পছন্দের তালিকা</AccountLink><AccountLink href="/e-library" onClick={() => setAccountOpen(false)}>ই-লাইব্রেরি</AccountLink>{identity.isAdmin && <AccountLink href="/admin" onClick={() => setAccountOpen(false)}>অ্যাডমিন</AccountLink>}<form action={signOutCustomer}><button type="submit" className="min-h-10 px-3 text-sm text-rose-700">লগআউট</button></form></> : <><AccountLink href="/login" onClick={() => setAccountOpen(false)}>লগইন</AccountLink><AccountLink href="/register" onClick={() => setAccountOpen(false)}>অ্যাকাউন্ট তৈরি</AccountLink></>}</div>}</div><Link href="/cart" aria-label={`কার্ট, ${cartCount}টি পণ্য`} className={iconButtonClass}><Icon name="cart" />{cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-5 text-white">{cartCount > 99 ? "99+" : cartCount}</span>}</Link></div>
      </div>
    </header>
    {drawerOpen && <div className="fixed inset-0 z-50"><button type="button" aria-label="মেনু বন্ধ করুন" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-slate-950/45" /><aside id="site-navigation-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="navigation-drawer-title" className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] flex-col bg-white shadow-2xl"><div className="flex min-h-16 items-center justify-between border-b px-4"><strong id="navigation-drawer-title" className="text-emerald-900">শিক্ষা নগরী</strong><button ref={closeButtonRef} type="button" onClick={() => setDrawerOpen(false)} aria-label="বন্ধ করুন" className={iconButtonClass}><Icon name="close" /></button></div><nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="প্রধান নেভিগেশন"><DrawerLink href="/" icon="home" onClick={() => setDrawerOpen(false)}>হোম</DrawerLink><DrawerLink href="/books" icon="book" onClick={() => setDrawerOpen(false)}>সব বই</DrawerLink><NavigationGroup title="বইয়ের বিভাগ" items={categoryMenu.books} basePath="/books" onNavigate={() => setDrawerOpen(false)} /><DrawerLink href="/products" icon="book" onClick={() => setDrawerOpen(false)}>অন্যান্য পণ্য</DrawerLink>{categoryMenu.products.length > 0 && <NavigationGroup title="পণ্যের বিভাগ" items={categoryMenu.products} basePath="/products" onNavigate={() => setDrawerOpen(false)} />}<DrawerLink href="/courses" icon="library" onClick={() => setDrawerOpen(false)}>কোর্স</DrawerLink><DrawerLink href="/account/orders" icon="library" onClick={() => setDrawerOpen(false)}>অর্ডার</DrawerLink><DrawerLink href="/contact" icon="user" onClick={() => setDrawerOpen(false)}>যোগাযোগ</DrawerLink></nav><div className="border-t p-3">{identity ? <><p className="px-3 pb-2 text-sm font-bold">{identity.displayName}</p>{identity.isAdmin && <DrawerLink href="/admin" icon="user" onClick={() => setDrawerOpen(false)}>অ্যাডমিন ড্যাশবোর্ড</DrawerLink>}<form action={signOutCustomer}><button type="submit" className="min-h-11 px-3 text-sm text-rose-700">লগআউট</button></form></> : <div className="grid grid-cols-2 gap-2"><Link href="/login" className="rounded-lg border p-3 text-center text-sm font-bold text-emerald-800">লগইন</Link><Link href="/register" className="rounded-lg bg-emerald-700 p-3 text-center text-sm font-bold text-white">নিবন্ধন</Link></div>}</div></aside></div>}
    <Suspense fallback={<nav aria-label="নিচের নেভিগেশন" className="fixed inset-x-0 bottom-0 z-40 h-16 border-t border-slate-200 bg-white sm:hidden" />}><MobileBottomNav identity={identity} cartCount={cartCount} /></Suspense>
  </>;
}

function MobileBottomNav({ identity, cartCount }: { identity: SiteIdentity; cartCount: number }) {
  const pathname = usePathname();
  const items: { href: string; icon: IconName; label: string; active: boolean; count?: number }[] = [
    { href: "/", icon: "home", label: "হোম", active: pathname === "/" },
    { href: "/books", icon: "book", label: "বই", active: pathname.startsWith("/books") },
    { href: "/cart", icon: "cart", label: "কার্ট", active: pathname.startsWith("/cart"), count: cartCount },
    { href: "/e-library", icon: "library", label: "লাইব্রেরি", active: pathname.startsWith("/e-library") },
    { href: identity ? "/dashboard/profile" : "/login", icon: "user", label: "অ্যাকাউন্ট", active: pathname.startsWith("/dashboard") || pathname === "/login" },
  ];
  return <nav aria-label="নিচের নেভিগেশন" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_16px_rgba(15,23,42,0.07)] backdrop-blur sm:hidden">{items.map((item) => <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} aria-label={`${item.label} পৃষ্ঠা${item.count ? `, ${item.count}টি পণ্য` : ""}`} className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold ${item.active ? "text-emerald-800" : "text-slate-600"}`}><span className="relative"><Icon name={item.icon} />{Boolean(item.count) && <span className="absolute -right-2 -top-1 rounded-full bg-rose-500 px-1 text-[9px] leading-4 text-white">{item.count! > 99 ? "99+" : item.count}</span>}</span><span>{item.label}</span></Link>)}</nav>;
}

function AccountLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) { return <Link href={href} onClick={onClick} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50">{children}</Link>; }
function DrawerLink({ href, onClick, children, icon }: { href: string; onClick: () => void; children: React.ReactNode; icon: IconName }) { return <Link href={href} onClick={onClick} className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50"><Icon name={icon} className="size-5 text-emerald-800" />{children}</Link>; }
function NavigationGroup({ title, items, basePath, onNavigate }: { title: string; items: MenuCategory[]; basePath: string; onNavigate: () => void }) { return <details className="group border-b border-slate-100"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3 text-sm font-bold">{title}<span className="transition group-open:rotate-180">⌄</span></summary><div className="pl-4">{items.map((item) => <div key={item.name}><Link href={`${basePath}?category=${encodeURIComponent(item.name)}`} onClick={onNavigate} className="flex min-h-11 items-center border-b border-slate-100 px-3 text-sm">{item.name}</Link>{item.children.length > 0 && <div className="pl-3">{item.children.map((child) => <Link key={child.name} href={`${basePath}?category=${encodeURIComponent(child.name)}`} onClick={onNavigate} className="flex min-h-10 items-center px-3 text-sm text-slate-600">{child.name}</Link>)}</div>}</div>)}</div></details>; }
