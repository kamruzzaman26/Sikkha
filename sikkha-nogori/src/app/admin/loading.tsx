export default function AdminLoading() {
  return (
    <main aria-label="Loading admin page" className="min-h-screen bg-[#f4f6fb] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-10 w-64 rounded-xl bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white" />)}
        </div>
        <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
        <div className="flex items-center gap-3 text-sm font-medium text-blue-800"><span className="size-4 animate-spin rounded-full border-2 border-blue-700 border-r-transparent" /> Loading page…</div>
      </div>
    </main>
  );
}
