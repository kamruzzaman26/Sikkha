// Shown instantly while an admin page loads, so every menu click gives feedback.
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading page" className="min-h-screen bg-canvas px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
      <div className="fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-brand-100">
        <div className="admin-progress-bar h-full w-1/3 bg-brand-600" />
      </div>
      <div className="mx-auto max-w-[1500px] animate-pulse">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-72 max-w-full rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-slate-200" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="mt-6 h-72 rounded-2xl border border-slate-200 bg-white" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
