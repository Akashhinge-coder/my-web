"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Table2, UtensilsCrossed,
  Users, Package, BarChart3, Receipt, Tag, Settings,
  ChevronRight, Flame, Star, Truck, Menu, X,
  Calendar, Clock, Gift, Zap, Package2, Link2
} from "lucide-react";
import { cn, isValidImageSrc } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  {
    group: "Operations",
    items: [
      { href: "/admin",               label: "Dashboard",    icon: LayoutDashboard },
      { href: "/admin/orders",        label: "Live Orders",  icon: ShoppingBag, badge: "live" },
      { href: "/admin/tables",        label: "Tables",       icon: Table2 },
      { href: "/admin/reservations",  label: "Reservations", icon: Calendar },
      { href: "/admin/waitlist",      label: "Waitlist",     icon: Clock },
    ],
  },
  {
    group: "Menu",
    items: [
      { href: "/admin/menu",         label: "Menu & Dishes", icon: UtensilsCrossed },
      { href: "/admin/menu/ar",      label: "AR Setup",      icon: Flame },
      { href: "/admin/combos",       label: "Combo Meals",   icon: Package2 },
      { href: "/admin/happy-hours",  label: "Happy Hours",   icon: Zap },
    ],
  },
  {
    group: "Business",
    items: [
      { href: "/admin/billing",      label: "Billing",       icon: Receipt },
      { href: "/admin/coupons",      label: "Coupons",       icon: Tag },
      { href: "/admin/loyalty",      label: "Loyalty",       icon: Gift },
      { href: "/admin/analytics",    label: "Analytics",     icon: BarChart3 },
      { href: "/admin/feedback",     label: "Feedback",      icon: Star },
      { href: "/admin/integrations", label: "Integrations",  icon: Link2 },
    ],
  },
  {
    group: "Management",
    items: [
      { href: "/admin/staff",      label: "Staff",      icon: Users },
      { href: "/admin/inventory",  label: "Inventory",  icon: Package },
      { href: "/admin/suppliers",  label: "Suppliers",  icon: Truck },
      { href: "/admin/settings",   label: "Settings",   icon: Settings },
    ],
  },
];

interface Props {
  restaurant: { id: string; name: string; slug: string; logo_url: string | null };
  userRole: string;
}

export default function AdminSidebar({ restaurant, userRole }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const restaurantName = restaurant?.name || "MENUARA";
  const restaurantSlug = restaurant?.slug || "";
  const restaurantId = restaurant?.id || "";

  const initials = restaurantName.charAt(0).toUpperCase() || "M";

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/menu" && pathname.startsWith("/admin/menu/ar")) return false;
    return pathname.startsWith(href);
  }

  const SidebarContent = () => (
    <>
      <div className="px-4 py-5 border-b border-dark-border">
        <Link href="/admin" className="flex items-center gap-3">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurantName}
              className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-dark-border"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#C17D3C,#E8A85F)" }}>
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{restaurantName}</p>
            <p className="text-xs text-ink-4 capitalize">{userRole}</p>
          </div>
        </Link>
      </div>
      <div className="px-4 pt-4 pb-2">
        <Link
          href={restaurantId ? `/kitchen/${restaurantId}` : "/admin"}
          target={restaurantId ? "_blank" : undefined}
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand/10 border border-brand/20 hover:bg-brand/15 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand animate-pulse-soft" />
            <span className="text-xs font-medium text-brand">Kitchen Display</span>
          </div>
          <ChevronRight className="w-3 h-3 text-brand/60 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-5 scrollbar-hide">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="section-label text-ink-4 px-2 mb-1.5">{group.group}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} scroll={false}
                  onClick={() => setMobileOpen(false)}
                  className={cn("sidebar-item", isActive(item.href) && "active")}>
                  <item.icon className="icon" />
                  <span className="flex-1">{item.label}</span>
                  {(item as { badge?: string }).badge === "live" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-soft" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-dark-border mt-2">
        <Link
          href={restaurantSlug ? `/${restaurantSlug}/preview` : "/admin"}
          target={restaurantSlug ? "_blank" : undefined}
          className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-dark-tertiary border border-dark-border hover:border-brand/30 transition-colors group text-xs"
        >
          <span className="text-ink-3 group-hover:text-white transition-colors">View customer menu</span>
          <ChevronRight className="w-3 h-3 text-ink-4 group-hover:text-brand transition-colors" />
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-60 bg-dark-secondary border-r border-dark-border fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>
      <button onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-dark-card border border-dark-border text-white">
        <Menu className="w-5 h-5" />
      </button>
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed inset-y-0 left-0 w-72 bg-dark-secondary border-r border-dark-border z-50 flex flex-col animate-slide-in">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-4 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
