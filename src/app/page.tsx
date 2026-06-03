"use client";
import Link from "next/link";
import { ArrowRight, QrCode, Sparkles, Zap, ShieldCheck, Smartphone } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "Scan & Order",
    desc: "Customers scan the table QR and order directly. No app needed, no waiter dependency.",
  },
  {
    icon: Sparkles,
    title: "AR Food View",
    desc: "See every dish appear on the actual table through the camera before ordering.",
  },
  {
    icon: Zap,
    title: "Live Kitchen Sync",
    desc: "Orders reach the kitchen instantly. Status updates flow back to the customer in real time.",
  },
  {
    icon: ShieldCheck,
    title: "GST Billing",
    desc: "Auto-calculated CGST + SGST on every bill. UPI, cash, card — all tracked.",
  },
  {
    icon: Smartphone,
    title: "Works Offline",
    desc: "Menu loads without internet. Orders queue and sync automatically when connection returns.",
  },
];

const stats = [
  { value: "0", label: "App installs needed" },
  { value: "10m", label: "Setup time for a restaurant" },
  { value: "5", label: "Photos to enable AR per dish" },
  { value: "₹0", label: "Menu reprinting, ever" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark text-white overflow-hidden">

      {/* ── Grain overlay ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── Ambient glow ── */}
      <div
        className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none z-0 opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #C17D3C 0%, transparent 70%)" }}
      />

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-dark-border/60">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #C17D3C, #E8A85F)" }}
          >
            M
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">
            MENUARA
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-ink-3 hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="btn-md btn-primary text-sm"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 px-6 md:px-12 pt-20 pb-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand text-xs font-medium mb-8">
          <Sparkles className="w-3 h-3" />
          AR-powered restaurant management for India
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight text-balance mb-6">
          Your menu,{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #C17D3C 0%, #E8A85F 50%, #C17D3C 100%)",
            }}
          >
            alive
          </span>
          {" "}in their camera
        </h1>

        <p className="text-lg text-ink-3 max-w-2xl mx-auto leading-relaxed mb-10 text-balance">
          Customers scan the table QR, see every dish in AR on their actual table,
          order directly, and pay with UPI — all without touching a paper menu or waiting for a waiter.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register" className="btn-xl btn-primary w-full sm:w-auto">
            Set up your restaurant
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="#how-it-works"
            className="btn-xl btn-dark w-full sm:w-auto text-ink-3"
          >
            See how it works
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-dark-border rounded-2xl overflow-hidden border border-dark-border">
          {stats.map((s) => (
            <div key={s.label} className="bg-dark-card p-5 text-center">
              <div className="font-display text-3xl font-semibold gradient-text">
                {s.value}
              </div>
              <div className="text-xs text-ink-3 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="how-it-works"
        className="relative z-10 px-6 md:px-12 py-20 max-w-6xl mx-auto"
      >
        <div className="text-center mb-14">
          <p className="section-label text-brand/70 mb-3">What MENUARA does</p>
          <h2 className="font-display text-4xl font-semibold text-white">
            Built for Indian restaurants
          </h2>
          <p className="text-ink-3 mt-3 max-w-xl mx-auto">
            From QR ordering to GST invoicing — everything your restaurant
            needs in one system that sets up in 10 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="card-dark p-6 hover:border-brand/30 transition-all duration-300 group"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4 group-hover:bg-brand/20 transition-colors">
                <f.icon className="w-5 h-5 text-brand" />
              </div>
              <h3 className="font-sans font-semibold text-white mb-2 text-base">
                {f.title}
              </h3>
              <p className="text-sm text-ink-3 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How AR works ── */}
      <section className="relative z-10 px-6 md:px-12 py-20 max-w-4xl mx-auto text-center">
        <p className="section-label text-brand/70 mb-3">The AR system</p>
        <h2 className="font-display text-4xl font-semibold text-white mb-6">
          5 photos. That&apos;s all it takes.
        </h2>
        <p className="text-ink-3 max-w-xl mx-auto mb-12 leading-relaxed">
          Upload Front, Back, Left, Right, and Top photos of any dish.
          Customers point their camera at the table — the dish appears in real size,
          anchored to the surface, with ingredients floating around it.
          No 3D models. No app. No expensive setup.
        </p>

        <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto mb-8">
          {["Front", "Back", "Left", "Right", "Top"].map((angle) => (
            <div
              key={angle}
              className="aspect-square rounded-xl bg-dark-card border border-dark-border flex flex-col items-center justify-center gap-1"
            >
              <div className="w-5 h-5 rounded-full bg-brand/20 border border-brand/30" />
              <span className="text-[10px] text-ink-4">{angle}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-ink-4">
          Admin uploads once → AR enabled for that dish → customers see it live
        </p>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-6 md:px-12 py-20">
        <div
          className="max-w-2xl mx-auto text-center rounded-3xl border border-brand/20 p-12"
          style={{
            background:
              "linear-gradient(135deg, rgba(193,125,60,0.08) 0%, rgba(232,168,95,0.04) 100%)",
          }}
        >
          <h2 className="font-display text-4xl font-semibold text-white mb-4">
            Ready to go live?
          </h2>
          <p className="text-ink-3 mb-8 leading-relaxed">
            Register your restaurant, set up your tables and menu, print your QR
            codes. Your first real order can happen today.
          </p>
          <Link href="/register" className="btn-xl btn-primary inline-flex">
            Register your restaurant
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-ink-4 mt-4">
            No credit card required · Setup in 10 minutes
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-dark-border px-6 md:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-4">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-white font-bold text-[10px]"
            style={{ background: "linear-gradient(135deg, #C17D3C, #E8A85F)" }}
          >
            M
          </div>
          <span className="font-display font-medium text-white/60 text-sm">
            MENUARA
          </span>
        </div>
        <p>Made for Indian restaurants · GST + UPI + AR</p>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms"   className="hover:text-white transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
