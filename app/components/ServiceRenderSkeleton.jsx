export default function ServiceRenderSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-6xl px-4 py-6"
      style={{ minHeight: "68vh" }}
    >
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <div className="mb-4 h-6 w-2/3 rounded bg-slate-200" />
        <div className="mb-2 h-4 w-full rounded bg-slate-200" />
        <div className="mb-6 h-4 w-5/6 rounded bg-slate-200" />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-xl bg-slate-200" />
          <div className="h-40 rounded-xl bg-slate-200" />
        </div>

        <div className="mt-6 grid gap-3">
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-11/12 rounded bg-slate-200" />
          <div className="h-4 w-3/4 rounded bg-slate-200" />
        </div>
      </div>
    </section>
  );
}
