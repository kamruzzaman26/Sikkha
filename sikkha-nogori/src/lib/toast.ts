export const TOAST_EVENT = "sikkha-toast";
export type ToastDetail = { message: string; tone?: "success" | "error" | "info"; href?: string; actionLabel?: string };

/** Shows a short on-screen confirmation (rendered by <Toaster />). Safe to call from any client code. */
export function showToast(detail: ToastDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail }));
}
