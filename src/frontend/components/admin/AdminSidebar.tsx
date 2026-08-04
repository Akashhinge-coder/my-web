"use client";
import Link from "next/link";
import Image from "next/image";
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
      { href: "/admin",               label: "Dashboard",    icon: LayoutDashboard, requiredPermission: null },
      { href: "/admin/orders",        label: "Live Orders",  icon: ShoppingBag, badge: "live", requiredPermission: "orders.view" },
      { href: "/admin/tables",        label: "Tables",       icon: Table2, requiredPermission: "tables.manage" },
      { href: "/admin/reservations",  label: "Reservations", icon: Calendar, requiredPermission: "reservations.manage" },
      { href: "/admin/waitlist",      label: "Waitlist",     icon: Clock, requiredPermission: "reservations.manage" },
    ],
  },
  {
    group: "Menu",
    items: [
      { href: "/admin/menu",         label: "Menu & Dishes", icon: UtensilsCrossed, requiredPermission: "menu.view" },
      { href: "/admin/menu/ar",      label: "AR Setup",      icon: Flame, requiredPermission: "menu.view" },
      { href: "/admin/combos",       label: "Combo Meals",   icon: Package2, requiredPermission: "menu.view" },
      { href: "/admin/happy-hours",  label: "Happy Hours",   icon: Zap, requiredPermission: "menu.view" },
    ],
  },
  {
    group: "Business",
    items: [
      { href: "/admin/billing",      label: "Billing",       icon: Receipt, requiredPermission: "billing.view" },
      { href: "/admin/coupons",      label: "Coupons",       icon: Tag, requiredPermission: "billing.view" },
      { href: "/admin/loyalty",      label: "Loyalty",       icon: Gift, requiredPermission: "billing.view" },
      { href: "/admin/analytics",    label: "Analytics",     icon: BarChart3, requiredPermission: "billing.view" },
      { href: "/admin/feedback",     label: "Feedback",      icon: Star, requiredPermission: "billing.view" },
      { href: "/admin/integrations", label: "Integrations",  icon: Link2, requiredPermission: "settings.manage" },
    ],
  },
  {
    group: "Management",
    items: [
      { href: "/admin/staff",      label: "Staff",      icon: Users, requiredPermission: "staff.manage" },
      { href: "/admin/inventory",  label: "Inventory",  icon: Package, requiredPermission: "inventory.manage" },
      { href: "/admin/suppliers",  label: "Suppliers",  icon: Truck, requiredPermission: "inventory.manage" },
      { href: "/admin/settings",   label: "Settings",   icon: Settings, requiredPermission: "settings.manage" },
    ],
  },
];

interface Props {
  restaurant: { id: string; name: string; slug: string; logo_url: string | null };
  userRole: string;
  permissions: string[];
}

export default function AdminSidebar({ restaurant, userRole, permissions }: Props) {
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

  const sidebarContent = (
    <>
      <div className="px-4 py-5 border-b border-admin-border-2">
        <Link href="/admin" className="flex items-center gap-3">
          {restaurant.logo_url ? (
            <Image
              src={restaurant.logo_url}
              alt={restaurantName || ""}
              width={36}
              height={36}
              unoptimized
              className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-admin-border-2"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground font-display font-bold text-sm flex-shrink-0 bg-gradient-to-br from-accent-cyan to-accent-blue">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{restaurantName}</p>
            <p className="text-xs capitalize" style={{ color: 'var(--admin-faint)' }}>{userRole}</p>
          </div>
        </Link>
      </div>
      <div className="px-4 pt-4 pb-2">
        <Link
          href={restaurantId ? `/kitchen/${restaurantId}` : "/admin"}
          target={restaurantId ? "_blank" : undefined}
          className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors group"
          style={{ 
            background: 'color-mix(in oklch, var(--primary) 8%, transparent)', 
            border: '1px solid color-mix(in oklch, var(--primary) 18%, transparent)' 
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in oklch, var(--primary) 14%, transparent)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in oklch, var(--primary) 8%, transparent)'; }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse-soft" style={{ background: 'var(--accent-cyan)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--accent-cyan)' }}>Kitchen Display</span>
          </div>
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" style={{ color: 'rgba(193,125,60,0.5)' }} />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-5 scrollbar-hide">
        {NAV.map((group) => {
          const visibleItems = group.items.filter(item => 
            !item.requiredPermission || permissions.includes(item.requiredPermission)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group}>
              <p className="section-label px-2 mb-1.5" style={{ color: 'var(--admin-faint)' }}>{group.group}</p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <Link key={item.href} href={item.href} scroll={false}
                    onClick={() => setMobileOpen(false)}
                    className={cn("sidebar-item", isActive(item.href) && "active")}>
                    <item.icon className="icon" />
                    <span className="flex-1">{item.label}</span>
                    {(item as { badge?: string }).badge === "live" && (
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: 'var(--accent-cyan)' }} />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-4 pt-2 border-t mt-2 border-admin-border-2">
        <Link
          href={restaurantSlug ? `/${restaurantSlug}/preview` : "/admin"}
          onClick={() => setMobileOpen(false)}
          className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors group text-xs bg-admin-card-2 border border-admin-border-2"
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'color-mix(in oklch, var(--primary) 25%, transparent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--admin-border-2)'; }}
        >
          <span className="group-hover:text-foreground transition-colors" style={{ color: 'var(--admin-subtle)' }}>View customer menu</span>
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-all" style={{ color: 'var(--admin-faint)' }} />
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside
        className="hidden md:flex flex-col w-60 fixed inset-y-0 left-0 z-30 bg-admin-card border-r border-admin-border-2"
      >
        {sidebarContent}
      </aside>
      <button onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-xl text-foreground bg-admin-card-2 border border-admin-border-2">
        <Menu className="w-5 h-5" />
      </button>
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside
            className="md:hidden fixed inset-y-0 left-0 w-72 z-50 flex flex-col animate-slide-in bg-admin-card border-r border-admin-border-2"
          >
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:text-foreground transition-colors" style={{ color: 'var(--admin-faint)' }}>
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
