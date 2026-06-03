import Link from "next/link";

export default function KitchenIndexPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-xl text-center rounded-3xl border border-border bg-white p-10 shadow-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-ink-4 mb-4">Kitchen display</p>
        <h1 className="text-3xl font-display font-semibold text-ink mb-4">Restaurant kitchen requires a restaurant ID</h1>
        <p className="text-sm leading-7 text-ink-3 mb-6">
          The kitchen display route is exposed as <code className="rounded bg-surface-secondary px-2 py-1">/kitchen/&lt;restaurantId&gt;</code>.
          Open the admin dashboard and use the Kitchen Display link, or add a restaurant ID to the URL.
        </p>
        <Link href="/admin" className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Open admin dashboard
        </Link>
      </div>
    </div>
  );
}
