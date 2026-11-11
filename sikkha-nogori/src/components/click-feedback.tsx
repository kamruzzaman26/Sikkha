"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Site-wide click feedback. Any button or link that starts a form submit or a
 * page change immediately shows a spinner on the pressed button and a thin
 * progress bar at the top of the screen, so people always see that the tap
 * was received. Works together with the per-button useFormStatus spinners.
 */
export function ClickFeedback() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [busy, setBusy] = useState(false);
  const marked = useRef<Set<HTMLElement>>(new Set());
  const timer = useRef<number | undefined>(undefined);

  function clearMarks() {
    marked.current.forEach((el) => el.removeAttribute("data-pending"));
    marked.current.clear();
    window.clearTimeout(timer.current);
    setBusy(false);
  }

  useEffect(() => {
    marked.current.forEach((el) => el.removeAttribute("data-pending"));
    marked.current.clear();
    window.clearTimeout(timer.current);
    const frame = window.requestAnimationFrame(() => setBusy(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, search]);

  useEffect(() => {
    function start(els: HTMLElement[]) {
      els.forEach((el) => {
        el.setAttribute("data-pending", "true");
        marked.current.add(el);
      });
      setBusy(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(clearMarks, 10000);
    }

    function onSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) return;
      const form = event.target as HTMLFormElement | null;
      if (!form || form.method === "dialog") return;
      const submitter = event.submitter as HTMLElement | null;
      const targets = submitter
        ? [submitter]
        : Array.from(form.querySelectorAll<HTMLElement>('button[type="submit"], button:not([type])'));
      start(targets);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start([anchor]);
    }

    function onShow() {
      clearMarks();
    }

    document.addEventListener("submit", onSubmit);
    document.addEventListener("click", onClick);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("submit", onSubmit);
      document.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", onShow);
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div aria-hidden="true" className={`click-progress ${busy ? "is-on" : ""}`}>
      <span />
    </div>
  );
}
