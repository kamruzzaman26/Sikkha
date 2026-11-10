"use client";

import { CartCount } from "@/components/cart-count";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { signOutCustomer } from "@/app/login/actions";

type SiteIdentity = {
  displayName: string;
  email: string;
  hasOrders: boolean;
  isAdmin: boolean;
} | null;

export type MenuCategory = { name: string; children: MenuCategory[] };
export type CategoryMenu = { books: MenuCategory[]; products: MenuCategory[] };

type IconName = "menu" | "search" | "heart" | "user" | "close";
type NavigationIconName =
  | "home"
  | "book"
  | "history"
  | "article"
  | "about"
  | "contact"
  | "disclosure"
  | "profile"
  | "orders"
  | "admin";

function Icon({ name }: { name: IconName }) {
  const shared = {
    "aria-hidden": true as const,
    className: "size-5",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "menu":
      return (
        <svg {...shared}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "search":
      return (
        <svg {...shared}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
    case "heart":
      return (
        <svg {...shared}>
          <path d="M20.2 8.8c0 4.2-8.2 10-8.2 10s-8.2-5.8-8.2-10a4.4 4.4 0 0 1 8.2-2.2 4.4 4.4 0 0 1 8.2 2.2Z" />
        </svg>
      );
    case "user":
      return (
        <svg {...shared}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.7-3.5 3.1-5.3 7-5.3s6.3 1.8 7 5.3" />
        </svg>
      );
    case "close":
      return (
        <svg {...shared}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
  }
}

function NavigationIcon({ name }: { name: NavigationIconName }) {
  const shared = {
    "aria-hidden": true as const,
    className: "size-5 shrink-0 text-emerald-800",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "home":
      return <svg {...shared}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" /></svg>;
    case "book":
      return <svg {...shared}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8m-8 4h7" /></svg>;
    case "history":
      return <svg {...shared}><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5m4-1v5l3 2" /></svg>;
    case "article":
      return <svg {...shared}><path d="M5 3.5h14v17H5zM8 8h8m-8 4h8m-8 4h5" /></svg>;
    case "about":
      return <svg {...shared}><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>;
    case "contact":
      return <svg {...shared}><path d="M4 5h16v14H4z" /><path d="m4 7 8 6 8-6" /></svg>;
    case "disclosure":
      return <svg {...shared}><path d="M4 5h16v14H4z" /><path d="M8 9h8m-8 3h8m-8 3h5" /></svg>;
    case "profile":
      return <svg {...shared}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.5 3.1-5.3 7-5.3s6.3 1.8 7 5.3" /></svg>;
    case "orders":
      return <svg {...shared}><path d="M5 4h14v16H5zM8 8h8m-8 4h8m-8 4h5" /></svg>;
    case "admin":
      return <svg {...shared}><path d="m12 3 8 3v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  }
}


function CategoryGlyph({ name }: { name: string }) {
  const value = name.toLowerCase();
  const glyph =
    /author|লেখক/.test(value) ? "✍" :
    /subject|বিষয়|বিষয়/.test(value) ? "▤" :
    /publisher|প্রকাশক/.test(value) ? "▣" :
    /discount|offer|ছাড়|ছাড়/.test(value) ? "％" :
    /academic|একাডেমিক|পাঠ্য/.test(value) ? "🎓" :
    /hsc|এইচএসসি/.test(value) ? "📘" :
    /admission|ভর্তি/.test(value) ? "📝" :
    /ebook|e-book|ই-বুক/.test(value) ? "▧" :
    /islam|ইসলাম|কুরআন|হাদিস/.test(value) ? "☪" :
    /stationery|স্টেশনারি/.test(value) ? "✏" :
    /food|grocery|খাদ্য|মুদি/.test(value) ? "▦" :
    /beauty|personal care|সৌন্দর্য/.test(value) ? "✿" :
    /diary|ডায়েরি|ডায়েরি/.test(value) ? "▣" :
    /calculator|ক্যালকুলেটর/.test(value) ? "＋" :
    /fan|ফ্যান/.test(value) ? "✥" :
    /art|শিল্প|আঁকা/.test(value) ? "✎" :
    /computer|কম্পিউটার|laptop/.test(value) ? "▣" :
    /mobile|phone|মোবাইল/.test(value) ? "▯" :
    /office|অফিস/.test(value) ? "▤" :
    /gaming|গেম/.test(value) ? "♢" :
    /network|নেটওয়ার্ক|নেটওয়ার্ক/.test(value) ? "⌘" :
    /sound|audio|সাউন্ড/.test(value) ? "♫" :
    /groom|গ্রুম/.test(value) ? "✂" :
    /appliance|যন্ত্রপাতি/.test(value) ? "⚙" :
    /science|বিজ্ঞান/.test(value) ? "⚗" :
    /baby|বেবি|শিশু/.test(value) ? "♡" :
    /kid|শিশু|বাচ্চা/.test(value) ? "☆" :
    /book|বই/.test(value) ? "▤" : "◇";
  return <span aria-hidden="true" className="inline-flex size-5 shrink-0 items-center justify-center text-base text-emerald-800">{glyph}</span>;
}

const iconButtonClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

type TopBar = {
  helpline: string;
  note: string;
  brandName?: string;
  tagline?: string;
  logoUrl?: string;
  announcement?: string;
  announcementLink?: string;
};

export function SiteHeader({
  identity,
  categoryMenu = { books: [], products: [] },
  topBar = { helpline: "", note: "" } as TopBar,
}: {
  identity: SiteIdentity;
  categoryMenu?: CategoryMenu;
  topBar?: TopBar;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!drawerOpen) {
      previousFocusRef.current?.focus();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) {
        return;
      }

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!accountOpen) {
      return;
    }

    function handleOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !accountRef.current?.contains(event.target)
      ) {
        setAccountOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [accountOpen]);

  function openDrawer() {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : menuButtonRef.current;
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
        {topBar.announcement && (
          <div className="bg-amber-100 px-4 py-2 text-center text-[13px] font-semibold text-amber-950">
            {topBar.announcementLink ? (
              <Link href={topBar.announcementLink} className="hover:underline">{topBar.announcement} →</Link>
            ) : (
              <span>{topBar.announcement}</span>
            )}
          </div>
        )}
        {/* Slim top bar (desktop): only links to pages that exist; no unverified claims. */}
        <div className="hidden bg-emerald-800 text-[11px] text-white sm:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1 lg:px-8">
            <span className="flex items-center gap-4 font-medium text-emerald-50">
              {topBar.note && <span>{topBar.note}</span>}
              {topBar.helpline && (
                <a href={`tel:${topBar.helpline.replace(/[^+\d]/g, "")}`} className="hover:underline">হেল্পলাইন: {topBar.helpline}</a>
              )}
              {!topBar.note && !topBar.helpline && <span>বই ও শেখার উপকরণের ক্যাটালগ</span>}
            </span>
            <nav aria-label="Top links" className="flex items-center gap-3">
              <Link href="/about" className="hover:underline">আমাদের সম্পর্কে</Link>
              <span aria-hidden="true" className="text-emerald-300">|</span>
              <Link href="/contact" className="hover:underline">যোগাযোগ</Link>
            </nav>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 sm:px-6 lg:flex-nowrap lg:gap-5 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-1 lg:flex-none">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={openDrawer}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls="site-navigation-drawer"
              className={iconButtonClass}
            >
              <Icon name="menu" />
            </button>
            <Link
              href="/"
              aria-label="Sikkha Nogori — Home"
              className="flex min-w-0 items-center gap-2 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {topBar.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={topBar.logoUrl} alt="" className="size-10 shrink-0 rounded-xl object-contain" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#006b4f] text-base font-extrabold text-white">
                  {(topBar.brandName || "শিক্ষা নগরী").slice(0, 1)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-base font-extrabold leading-tight text-[#064b3b] sm:text-lg">
                  {topBar.brandName || "শিক্ষা নগরী"}
                </span>
                {(topBar.tagline || !topBar.brandName) && (
                  <span className="hidden max-w-[16rem] truncate text-[11px] font-medium text-slate-500 min-[390px]:block">
                    {topBar.tagline || "Sikkha Nogori"}
                  </span>
                )}
              </span>
            </Link>
          </div>

          <form
            action="/books"
            method="get"
            role="search"
            className="order-3 w-full lg:order-none lg:min-w-0 lg:flex-1"
          >
            <label className="sr-only" htmlFor="site-search">
              Search books, authors, or categories
            </label>
            <div className="flex min-h-11 rounded-xl border border-slate-200 bg-[#f8faf9] p-1 transition focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
              <span className="flex items-center pl-2.5 text-slate-500">
                <Icon name="search" />
              </span>
              <input
                id="site-search"
                name="q"
                type="search"
                placeholder="Search books, authors, or categories"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                aria-label="Search"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#006b4f] px-3 text-sm font-bold text-white transition hover:bg-[#005640] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <Icon name="search" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>

          <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1">
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              title="Wishlist"
              className={iconButtonClass}
            >
              <Icon name="heart" />
            </Link>
            <div className="relative" ref={accountRef}>
              <button
                ref={accountButtonRef}
                type="button"
                aria-label={identity ? `অ্যাকাউন্ট: ${identity.displayName}`  : "Login or account"}
                aria-expanded={accountOpen}
                aria-controls="account-menu"
                onClick={() => setAccountOpen((open) => !open)}
                className={iconButtonClass}
              >
                <Icon name="user" />
              </button>
              {accountOpen && (
                <div
                  id="account-menu"
                  className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
                >
                  {identity ? (
                    <>
                      <div className="border-b border-slate-100 px-3 pb-3">
                        <p className="font-bold text-slate-900">
                          {identity.displayName}
                        </p>
                        {identity.email && (
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {identity.email}
                          </p>
                        )}
                      </div>
                      <nav aria-label="Account menu" className="mt-2 grid">
                        <AccountLink href="/dashboard/profile" onClick={() => setAccountOpen(false)}>Account Info</AccountLink>
                        <AccountLink href="/account/orders" onClick={() => setAccountOpen(false)}>Orders &amp; Tracking</AccountLink>
                        <AccountPlaceholder>Rating &amp; Reviews</AccountPlaceholder>
                        <AccountPlaceholder>My Interests</AccountPlaceholder>
                        <AccountPlaceholder>Following Authors</AccountPlaceholder>
                        <AccountLink href="/wishlist" onClick={() => setAccountOpen(false)}>Wishlist</AccountLink>
                        <AccountPlaceholder>Saved List</AccountPlaceholder>
                        <AccountLink href="/e-library" onClick={() => setAccountOpen(false)}>eBook Library</AccountLink>
                        <AccountPlaceholder>Bookshelf</AccountPlaceholder>
                        <AccountPlaceholder>Bhash Account</AccountPlaceholder>
                        <AccountPlaceholder>Rokomari Balance</AccountPlaceholder>
                        <AccountPlaceholder>Rokomari Points</AccountPlaceholder>
                      </nav>
                      <form action={signOutCustomer} className="mt-2 border-t border-slate-100 pt-2">
                        <button
                          type="submit"
                          className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700"
                        >
                          Sign Out
                        </button>
                      </form>
                    </>
                  ) : (
                    <nav aria-label="Login menu" className="grid gap-1">
                      <p className="px-3 py-2 text-sm font-semibold text-slate-600">
                        Your Account
                      </p>
                      <AccountLink href="/login" onClick={() => setAccountOpen(false)}>
                        Login
                      </AccountLink>
                      <AccountLink href="/register" onClick={() => setAccountOpen(false)}>
                        Create Account
                      </AccountLink>
                    </nav>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeDrawer}
            className="absolute inset-0 cursor-default bg-slate-950/45"
          />
          <aside
            id="site-navigation-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="navigation-drawer-title"
            className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] flex-col bg-white shadow-2xl"
          >
            <div className="flex min-h-16 items-center justify-between border-b border-slate-100 px-4">
              <Link
                href="/"
                onClick={closeDrawer}
                className="flex items-center gap-2 font-extrabold text-[#064b3b]"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#006b4f] text-sm text-white">
                  শি
                </span>
                <span id="navigation-drawer-title">শিক্ষা নগরী</span>
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDrawer}
                aria-label="Close menu"
                className={iconButtonClass}
              >
                <Icon name="close" />
              </button>
            </div>

            <nav
              aria-label="Main navigation"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
            >
              <DrawerLink icon="home" href="/" onClick={closeDrawer}>Home</DrawerLink>
              <DrawerLink icon="history" href="/account/orders" onClick={closeDrawer}>Buy Again</DrawerLink>
              <DrawerLink icon="article" href="/books?category=বই%20মেলা%202026" onClick={closeDrawer}>বই মেলা ২০২৬</DrawerLink>

              <NavigationGroup title="বই" href="/books" onNavigate={closeDrawer} items={[
                "লেখক", "বিষয়", "প্রকাশনী", "অতিরিক্ত ছাড়ের বই", "একাডেমিক বই",
                "একাদশ ও দ্বাদশ শ্রেণির বই", "ভর্তি প্রস্তুতি", "বইমেলা ২০২৬"
              ]} basePath="/books" />
              <DrawerLink icon="book" href="/products?category=ই-বুক" onClick={closeDrawer}>ই-বুক</DrawerLink>

              <NavigationGroup title="সুপার স্টোর" href="/products" onNavigate={closeDrawer} items={[
                "Weekly Bestseller", "Islamic Accessories", "Stationery", "Organic Food",
                "Buy 1 Get 1 Offer", "Beauty & Personal Care", "Voucher", "Diary/Notebook",
                "Calculator", "Groceries", "Fan and Ventilator", "Drawing & Art Supplies"
              ]} basePath="/products" />
              <DrawerLink icon="article" href="/books?category=শিক্ষা%20কুইজ" onClick={closeDrawer}>শিক্ষা কুইজ</DrawerLink>

              <NavigationGroup title="ইলেকট্রনিক্স" href="/products" onNavigate={closeDrawer} items={[
                "Computer & Accessories", "Mobile & Accessories", "Office Equipment", "Gaming Zone",
                "Networking", "Sound System", "Grooming & Lifestyle", "Appliances",
                "Fan and ventilator", "Science Kit"
              ]} basePath="/products" />
              <NavigationGroup title="কিডস জোন" href="/products" onNavigate={closeDrawer} items={[
                "Diaper & Potty", "Feeding", "Kids Toys", "Lotions & Creams", "Teethers & Pacifier",
                "Grooming", "Oral & Health", "Body Wash", "Mum Pot & Cups", "Bathing"
              ]} basePath="/products" />

              <div className="mt-5 border-t border-slate-200 pt-3">
                <p className="px-3 pb-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800">সহায়তা ও অন্যান্য</p>
                <DrawerLink icon="article" href="/affiliate" onClick={closeDrawer}>ঘরে বসে আয় করুন</DrawerLink>
                <DrawerLink icon="article" href="/books?category=বেস্টসেলার%20অ্যাওয়ার্ড" onClick={closeDrawer}>বেস্টসেলার অ্যাওয়ার্ড, ২৫</DrawerLink>
                <DrawerLink icon="article" href="/affiliate" onClick={closeDrawer}>শিক্ষা নগরী উদ্যোক্তা</DrawerLink>
                <DrawerPlaceholder>Bulk Order</DrawerPlaceholder>
                <DrawerLink icon="orders" href="/account/orders" onClick={closeDrawer}>Orders &amp; Tracking</DrawerLink>
                <DrawerPlaceholder>Writer/Publisher Request</DrawerPlaceholder>
                <DrawerPlaceholder>Retailer Request</DrawerPlaceholder>
                <DrawerLink icon="contact" href="/contact" onClick={closeDrawer}>Contact Us</DrawerLink>
                <DrawerLink icon="about" href="/about" onClick={closeDrawer}>About Us</DrawerLink>
                <DrawerLink icon="article" href="/blog" onClick={closeDrawer}>Blog</DrawerLink>
                <DrawerPlaceholder>Career</DrawerPlaceholder>
                <DrawerLink icon="disclosure" href="/terms" onClick={closeDrawer}>Terms and Conditions</DrawerLink>
              </div>
            </nav>

            <div className="border-t border-slate-100 p-3">
              {identity ? (
                <>
                  <p className="truncate px-3 pb-2 text-sm font-bold text-slate-700">
                    {identity.displayName}
                  </p>
                  <DrawerLink icon="profile" href="/dashboard/profile" onClick={closeDrawer}>
                    Profile
                  </DrawerLink>
                  <DrawerLink icon="orders" href="/account/orders" onClick={closeDrawer}>
                    Orders
                  </DrawerLink>
                  {identity.isAdmin && (
                    <DrawerLink icon="admin" href="/admin" onClick={closeDrawer}>
                      Admin Dashboard
                    </DrawerLink>
                  )}
                  <form action={signOutCustomer} className="mt-1">
                    <button
                      type="submit"
                      className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700"
                    >
                      Sign Out
                    </button>
                  </form>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={closeDrawer}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeDrawer}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-3 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {portalReady && createPortal(
        <nav aria-label="Bottom navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_18px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <BottomNavItem href="/" icon="⌂" label="হোম" />
          <BottomNavItem href="/books" icon="▤" label="বই" />
          <BottomNavItem href="/cart" icon="🛒" label="কার্ট" badge={<CartCount />} />
          <BottomNavItem href="/e-library" icon="▧" label="ই-লাইব্রেরি" />
          <BottomNavItem href={identity ? "/dashboard/profile" : "/login"} icon="♙" label="অ্যাকাউন্ট" />
        </nav>,
        document.body,
      )}
    </>
  );
}


function NavigationGroup({
  title,
  href,
  items,
  basePath,
  onNavigate,
}: {
  title: string;
  href: string;
  items: string[];
  basePath: string;
  onNavigate: () => void;
}) {
  return (
    <details className="group border-b border-slate-100">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 text-sm font-bold text-slate-800 outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-700 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3"><CategoryGlyph name={title} />{title}</span>
        <span aria-hidden="true" className="transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="pb-2 pl-5">
        <DrawerLink icon="book" href={href} onClick={onNavigate}>সব {title}</DrawerLink>
        {items.map((item) => (
          <Link
            key={item}
            href={`${basePath}?category=${encodeURIComponent(item)}`}
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 border-b border-slate-100 px-3 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
          >
            <CategoryGlyph name={item} />{item}
          </Link>
        ))}
      </div>
    </details>
  );
}

function BottomNavItem({ href, icon, label, disabled = false, badge }: { href?: string; icon: string; label: string; disabled?: boolean; badge?: React.ReactNode }) {
  const baseClass = "flex min-w-0 min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-[10px] font-bold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
  if (disabled || !href) return <span aria-disabled="true" title={label+" পৃষ্ঠা এখনো চালু হয়নি"} className={baseClass+" text-slate-400 opacity-60"}><span aria-hidden="true" className="text-lg leading-5">{icon}</span>{label}</span>;
  return <Link href={href} aria-label={label+" পৃষ্ঠায় যান"} className={baseClass}><span className="relative"><span aria-hidden="true" className="text-lg leading-5">{icon}</span>{badge}</span><span>{label}</span></Link>;
}

function AccountPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <span aria-disabled="true" title="এই সুবিধাটি শিগগিরই চালু হবে" className="flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-slate-400">
      {children}<span className="ml-auto text-[10px] font-semibold">শীঘ্রই</span>
    </span>
  );
}

function DrawerPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <span aria-disabled="true" title="এই সুবিধাটি শিগগিরই চালু হবে" className="flex min-h-11 items-center gap-3 border-b border-slate-100 px-3 text-sm font-medium text-slate-400">
      <span aria-hidden="true" className="size-5 shrink-0" />{children}<span className="ml-auto text-[10px] font-semibold">শীঘ্রই</span>
    </span>
  );
}

function AccountLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
    >
      {children}
    </Link>
  );
}

function DrawerLink({
  href,
  onClick,
  children,
  icon,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
  icon: NavigationIconName;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700"
    >
      <NavigationIcon name={icon} />
      {children}
    </Link>
  );
}

function CategoryTree({
  items,
  basePath,
  onNavigate,
}: {
  items: MenuCategory[];
  basePath: string;
  onNavigate: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const href = `${basePath}?category=${encodeURIComponent(item.name)}`;
        if (item.children.length === 0) {
          return (
            <Link key={item.name} href={href} onClick={onNavigate} className="flex min-h-11 items-center gap-3 border-b border-slate-100 px-3 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"><CategoryGlyph name={item.name} />
              {item.name}
            </Link>
          );
        }
        return (
          <details key={item.name} className="group/sub border-b border-slate-100">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 text-sm font-semibold text-slate-700 outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-700 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3"><CategoryGlyph name={item.name} />{item.name}</span>
              <span aria-hidden="true" className="transition group-open/sub:rotate-180">⌄</span>
            </summary>
            <div className="pl-4">
              <DrawerLink icon="book" href={href} onClick={onNavigate}>
                সব {item.name}
              </DrawerLink>
              <CategoryTree
                items={item.children}
                basePath={basePath}
                onNavigate={onNavigate}
              />
            </div>
          </details>
        );
      })}
    </>
  );
}
