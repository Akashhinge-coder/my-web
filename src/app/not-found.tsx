import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center text-center p-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-display font-bold text-2xl mb-6"
        style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}
      >
        M
      </div>
      <h1 className="font-display text-4xl font-semibold text-white mb-3">404</h1>
      <p className="text-ink-3 mb-8 max-w-sm">
        This page doesn't exist yet or the link is invalid.
      </p>
      <Link href="/" className="btn-md btn-primary inline-flex">
        Go home
      </Link>
    </div>
  );
}
