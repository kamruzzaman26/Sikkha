"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOutCustomer } from "@/app/login/actions";
import { readCart } from "@/lib/cart";

 type SiteIdentity = {
  displayName: string;
  email: string;
  hasOrders: boolean;
  isAdmin: boolean;
} | null;

export type MenuCategory = { name: string; children: MenuCategory[] };
export type CategoryMenu = { books: MenuCategory[]; products: MenuCategory[] };
type IconName = "menu" | "search" | "heart" | "user" | "close" | "cart" | "home" | "book" | "library";

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const shared = { "aria-hidden": true as const, className, fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.8, viewBox: "0 0 24 24" };
  switch (name) {
    case "menu": return <svg {...shared}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    case "search": return <svg {...shared}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
    case "heart": return <svg {...shared}><path d="M20.2 8.8c0 4.2-8.2 10-8.2 10s-8.2-5.8-8.2-10a4.4 4.4 0 0 1 8.2-2.2 4.4 4.4 0 0 1 8.2 2.2Z" /></svg>;
    case "user": return <svg {...shared}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.5 3.1-5.3 7-5.3s6.3 1.8 7 5.3" /></svg>;
    case "close": return <svg {...shared}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "cart": return <svg {...shared}><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>;
    case "home": return <svg {...shared}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></svg>;
    case "book": return <svg {...shared}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8m-8 4h7" /></svg>;
    case "library": return <svg {...shared}><path d="M4 5h16v15H4zM8 9h8m-8 4h8m-8 4h5" /><path d="M7 3v2m10-2v2" /></svg>;
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
  const pathname = usePathname();

  useEffect(() => {
    const updateCart = () => setCartCount(readCart().reduce((total, item) => total + item.quantity, 0));
    updateCart();
    window.addEventListener("storage", updateCart);
    window.addEventListener("sikkha-cart-change", updateCart);
    return () => {
      window.removeEventListener("storage", updateCart);
      window.removeEventListener("sikkha-cart-change", updateCart);
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [drawerOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setAccountOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setAccountOpen(false); accountButtonRef.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [accountOpen]);

  const closeDrawer = () => setDrawerOpen(false);
  const countLabel = cartCount > 99 ? "99+" : String(cartCount);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-6 lg:gap-5 lg:px-8">
          <button ref={menuButtonRef} type="button" onClick={() => setDrawerOpen(true)} aria-label="মেনু খুলুন" aria-expanded={drawerOpen} aria-controls="site-navigation-drawer" className={iconButtonClass}><Icon name="menu" /></button>
          <Link href="/" aria-label="শিক্ষা নগরী — হোম" className="hidden shrink-0 items-center gap-2 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-emerald-700 sm:flex">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#006b4f] text-base font-extrabold text-white">শি</span>
            <span><span className="block text-base font-extrabold leading-tight text-[#064b3b] lg:text-lg">শিক্ষা নগরী</span><span className="hidden text-[11px] text-slate-500 lg:block">Sikkha Nogori</span></span>
          </Link>
          <form action="/books" method="get" role="search" className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="site-search">বই, লেখক বা বিভাগ খুঁজুন</label>
            <div className="flex min-h-11 rounded-xl border-2 border-[#2465a8] bg-white p-1 focus-within:ring-2 focus-within:ring-blue-100 sm:border-slate-200 sm:bg-[#f8faf9] sm:focus-within:border-emerald-600">
              <span className="flex items-center pl-1.5 text-slate-500"><Icon name="search" className="size-4 sm:size-5" /></span>
              <input id="site-search" name="q" type="search" placeholder="বই, লেখক ও প্রকাশনী খুঁজুন" className="min-w-0 flex-1 bg-transparent px-2 text-xs text-slate-800 outline-none placeholder:text-slate-500 sm:text-sm" />
              <button type="submit" className="min-h-8 rounded-lg bg-[#2465a8] px-3 text-xs font-bold text-white transition hover:bg-[#19538f] sm:px-4 sm:text-sm">খুঁজুন</button>
            </div>
          </form>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Link href="/wishlist" aria-label="পছন্দের তালিকা" title="পছন্দের তালিকা" className={`${iconButtonClass} hidden sm:inline-flex`}><Icon name="heart" /></Link>
            <div className="relative hidden sm:block" ref={accountRef}>
              <button ref={accountButtonRef} type="button" aria-label={identity ? `অ্যাকাউন্ট: ${identity.displayName}` : "লগইন বা অ্যাকাউন্ট"} aria-expanded={accountOpen} aria-controls="account-menu" onClick={() => setAccountOpen((open) => !open)} className={iconButtonClass}><Icon name="user" /></button>
              {accountOpen && <div id="account-menu" className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                {identity ? <><div className="border-b border-slate-100 px-3 pb-3"><p className="font-bold text-slate-900">{identity.displayName}</p>{identity.email && <p className="mt-1 break-all text-xs text-slate-500">{identity.email}</p>}</div><nav aria-label="অ্যাকাউন্ট মেনু" className="mt-2 grid"><AccountLink href="/dashboard/profile" onClick={() => setAccountOpen(false)}>অ্যাকাউন্ট ত��্য</AccountLink><AccountLink href="/account/orders" onClick={() => setAccountOpen(false)}>অর্ডার ও ট্র্যাকিং</AccountLink><AccountLink href="/wishlist" onClick={() => setAccountOpen(false)}>পছন্দের তালিকা</AccountLink><AccountLink href="/e-library" onClick={() => setAccountOpen(false)}>ই-লাইব্রেরি</AccountLink>{identity.isAdmin && <AccountLink href="/admin" onClick={() => setAccountOpen(false)}>অ্যাডমিন ড্যাশবোর্ড</AccountLink>}</nav><form action={signOutCustomer} className="mt-2 border-t border-slate-100 pt-2"><button type="submit" className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50">লগআউট</button></form></> : <nav aria-label="লগইন মেনু" className="grid gap-1"><p className="px-3 py-2 text-sm font-semibold text-slate-600">আপনার অ্যাকাউন্ট</p><AccountLink href="/login" onClick={() => setAccountOpen(false)}>লগইন</AccountLink><AccountLink href="/register" onClick={() => setAccountOpen(false)}>অ্যাকাউন্ট তৈরি</AccountLink></nav>}
              </div>}
            </div>
            <Link href="/cart" aria-label={`কার্ট, ${cartCount}টি পণ্য`} title="কার্ট" className={iconButtonClass}><Icon name="cart" />{cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-5 text-white">{countLabel}</span>}</Link>
          </div>
        </div>
      </header>

      {drawerOpen && <div className="fixed inset-0 z-50">
        <button type="button" aria-label="মেনু বন্ধ করুন" onClick={closeDrawer} className="absolute inset-0 cursor-default bg-slate-950/45" />
        <aside id="site-navigation-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="navigation-drawer-title" className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] flex-col bg-white shadow-2xl">
          <div className="flex min-h-16 items-center justify-between border-b border-slate-100 px-4"><Link href="/" onClick={closeDrawer} className="flex items-center gap-2 font-extrabold text-[#064b3b]"><span className="flex size-9 items-center justify-center rounded-xl bg-[#006b4f] text-sm text-white">শি</span><span id="navigation-drawer-title">শিক্ষা নগরী</span></Link><button ref={closeButtonRef} type="button" onClick={closeDrawer} aria-label="মেনু বন্ধ করুন" className={iconButtonClass}><Icon name="close" /></button></div>
          <nav aria-label="প্রধান নেভিগেশন" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <DrawerLink href="/" onClick={closeDrawer} icon="home">হোম</DrawerLink><DrawerLink href="/books" onClick={closeDrawer} icon="book">সব বই</DrawerLink>
            <NavigationGroup title="বইয়ের বিভাগ" href="/books" items={categoryMenu.books} basePath="/books" onNavigate={closeDrawer} />
            <DrawerLink href="/products" onClick={closeDrawer} icon="book">অন্যান্য পণ্য</DrawerLink>
            {categoryMenu.products.length > 0 && <NavigationGroup title="পণ্যের বিভাগ" href="/products" items={categoryMenu.products} basePath="/products" onNavigate={closeDrawer} />}
            <DrawerLink href="/courses" onClick={closeDrawer} icon="library">কোর্স</DrawerLink><DrawerLink href="/account/orders" onClick={closeDrawer} icon="library">অর্ডার ও ট্র্যাকিং</DrawerLink><DrawerLink href="/wishlist" onClick={closeDrawer} icon="heart">পছন্দের তালিকা</DrawerLink><DrawerLink href="/contact" onClick={closeDrawer} icon="user">যোগাযোগ</DrawerLink><DrawerLink href="/about" onClick={closeDrawer} icon="user">আমাদের সম্পর্কে</DrawerLink>
          </nav>
          <div className="border-t border-slate-100 p-3">{identity ? <><p className="truncate px-3 pb-2 text-sm font-bold text-slate-700">{identity.displayName}</p>{identity.isAdmin && <DrawerLink href="/admin" onClick={closeDrawer} icon="user">অ্যাডমিন ড্যাশবোর্ড</DrawerLink>}<form action={signOutCustomer} className="mt-1"><button type="submit" className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50">লগআউট</button></form></> : <div className="grid grid-cols-2 gap-2"><Link href="/login" onClick={closeDrawer} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 px-3 text-sm font-bold text-emerald-800">লগইন</Link><Link href="/register" onClick={closeDrawer} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-3 text-sm font-bold text-white">নিবন্ধন</Link></div>}</div>
        </aside>
      </div>}

      <nav aria-label="নিচের নেভিগেশন" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_16px_rgba(15,23,42,0.07)] backdrop-blur sm:hidden">
        <BottomNavItem href="/" icon="home" label="হোম" active={pathname === "/"} /><BottomNavItem href="/books" icon="book" label="বই" active={pathname.startsWith("/books")} /><BottomNavItem href="/cart" icon="cart" label="কার্ট" active={pathname.startsWith("/cart")} count={cartCount} /><BottomNavItem href="/e-library" icon="library" label="ই-লাইব্রেরি" active={pathname.startsWith("/e-library")} /><BottomNavItem href={identity ? "/dashboard/profile" : "/login"} icon="user" label="অ্যাকাউন্ট" active={pathname.startsWith("/dashboard") || pathname === "/login"} />
      </nav>
    </>
  );
}

function NavigationGroup({ title, href, items, basePath, onNavigate }: { title: string; href: string; items: MenuCategory[]; basePath: string; onNavigate: () => void }) {
  return <details className="group border-b border-slate-100"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-sm font-bold text-slate-800 hover:bg-emerald-50"><span>{title}</span><span aria-hidden="true" className="transition group-open:rotate-180">⌄</span></summary><div className="pb-2 pl-4"><Link href={href} onClick={onNavigate} className="flex min-h-11 items-center border-b border-slate-100 px-3 text-sm font-bold text-emerald-800">সব {title}</Link><CategoryTree items={items} basePath={basePath} onNavigate={onNavigate} /></div></details>;
}

function CategoryTree({ items, basePath, onNavigate }: { items: MenuCategory[]; basePath: string; onNavigate: () => void }) {
  return <>{items.map((item) => item.children.length === 0 ? <Link key={item.name} href={`${basePath}?category=${encodeURIComponent(item.name)}`} onClick={onNavigate} className="flex min-h-11 items-center border-b border-slate-100 px-3 text-sm font-medium text-slate-600 hover:bg-emerald-50">{item.name}</Link> : <details key={item.name} className="group/sub border-b border-slate-100"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold text-slate-700">{item.name}<span aria-hidden="true" className="transition group-open/sub:rotate-180">⌄</span></summary><div className="pl-3"><Link href={`${basePath}?category=${encodeURIComponent(item.name)}`} onClick={onNavigate} className="flex min-h-10 items-center px-3 text-sm font-bold text-emerald-800">সব {item.name}</Link><CategoryTree items={item.children} basePath={basePath} onNavigate={onNavigate} /></div></details>)}</>;
}

function BottomNavItem({ href, icon, label, active, count = 0 }: { href: string; icon: IconName; label: string; active: boolean; count?: number }) {
  return <Link href={href} aria-label={`${label} পৃষ্ঠায় যান${count ? `, ${count}টি পণ্য` : ""}`} aria-current={active ? "page" : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 ${active ? "text-emerald-800" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"}`}><span className="relative"><Icon name={icon} className="size-5" />{count > 0 && <span className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold leading-4 text-white">{count > 99 ? "99+" : count}</span>}</span><span>{label}</span></Link>;
}

function AccountLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return <Link href={href} onClick={onClick} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700">{children}</Link>;
}

function DrawerLink({ href, onClick, children, icon }: { href: string; onClick: () => void; children: React.ReactNode; icon: IconName }) {
  return <Link href={href} onClick={onClick} className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700"><Icon name={icon} className="size-5 shrink-0 text-emerald-800" />{children}</Link>;
}
