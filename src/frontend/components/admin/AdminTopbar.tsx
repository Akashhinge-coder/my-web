"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, ChevronDown, ExternalLink } from "lucide-react";
import { createClient } from "@/config/supabase/client";
import Link from "next/link";

interface Props {
  restaurant: { id: string; name: string; slug: string };
  userEmail: string;
}

export default function AdminTopbar({ restaurant, userEmail }: Props) {
  const router  = useRouter();
  const supabase = createClient();
  const [userOpen, setUserOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const restaurantName = restaurant?.name || "MENUARA";
  const restaurantSlug = restaurant?.slug || "";
  const fallbackMenuHref = restaurantSlug ? `/${restaurantSlug}` : "/admin";

  return (
    <header className="sticky top-0 z-20 backdrop-blur-md px-6 md:px-8 py-3 flex items-center justify-between gap-4" style={{ background: 'rgba(17,20,32,0.85)', borderBottom: '1px solid var(--admin-border-2)' }}>
      {/* Left — breadcrumb on mobile becomes logo space */}
      <div className="flex items-center gap-3 ml-10 md:ml-0">
        <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: 'var(--admin-faint)' }}>
          <span className="text-white font-medium">{restaurantName}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Customer menu link */}
        <Link
          href={fallbackMenuHref}
          target={restaurantSlug ? "_blank" : undefined}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all hover:text-white"
          style={{ border: '1px solid var(--admin-border-2)', color: 'var(--admin-subtle)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,125,60,0.35)'; e.currentTarget.style.color = 'var(--accent-cyan)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--admin-border-2)'; e.currentTarget.style.color = 'var(--admin-subtle)'; }}
        >
          Customer menu
          <ExternalLink className="w-3 h-3" />
        </Link>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl transition-all hover:text-white"
          style={{ color: 'var(--admin-subtle)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--admin-card-2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-cyan)' }} />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
            style={{ border: '1px solid var(--admin-border-2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(193,125,60,0.35)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--admin-border-2)'; }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(193,125,60,0.15)', border: '1px solid rgba(193,125,60,0.30)', color: 'var(--accent-cyan)' }}
            >
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-xs max-w-[120px] truncate" style={{ color: 'var(--admin-subtle)' }}>
              {userEmail}
            </span>
            <ChevronDown className="w-3 h-3" style={{ color: 'var(--admin-faint)' }} />
          </button>

          {userOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-card-lg z-20 overflow-hidden animate-fade-in"
                style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-2)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border-2)' }}>
                  <p className="text-xs truncate" style={{ color: 'var(--admin-faint)' }}>{userEmail}</p>
                </div>
                <div className="p-1">
                  <Link
                    href="/admin/settings"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:text-white"
                    style={{ color: 'var(--admin-subtle)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--admin-card-2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
