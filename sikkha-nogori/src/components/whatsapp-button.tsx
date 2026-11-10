"use client";

import { usePathname } from "next/navigation";

/** Floating chat button on public pages; hidden in the admin area and during checkout. */
export function WhatsAppButton({ href }: { href: string }) {
  const pathname = usePathname() ?? "";
  if (!href || pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="হোয়াটসঅ্যাপে মেসেজ করুন"
      className="whatsapp-float fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 transition hover:scale-105 hover:bg-[#1ebe5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:scale-95 sm:bottom-6 sm:right-6"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 fill-current">
        <path d="M16.04 3C9.4 3 4 8.38 4 15.02c0 2.12.55 4.18 1.6 6L4 28l7.17-1.88a12.02 12.02 0 0 0 4.87 1.02h.01C22.68 27.14 28 21.76 28 15.12 28 8.45 22.68 3 16.04 3Zm0 21.98h-.01a9.95 9.95 0 0 1-5.07-1.39l-.36-.22-4.25 1.12 1.13-4.15-.24-.38a9.93 9.93 0 0 1-1.53-5.3c0-5.5 4.5-9.97 10.04-9.97 2.68 0 5.2 1.04 7.09 2.93a9.9 9.9 0 0 1 2.94 7.06c0 5.5-4.5 9.97-9.99 9.97Zm5.47-7.46c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
