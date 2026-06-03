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
    <header className="sticky top-0 z-20 bg-dark-secondary/80 backdrop-blur-md border-b border-dark-border px-6 md:px-8 py-3 flex items-center justify-between gap-4">
      {/* Left — breadcrumb on mobile becomes logo space */}
      <div className="flex items-center gap-3 ml-10 md:ml-0">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-ink-4">
          <span className="text-white font-medium">{restaurantName}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Customer menu link */}
        <Link
          href={fallbackMenuHref}
          target={restaurantSlug ? "_blank" : undefined}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-border text-xs text-ink-3 hover:text-white hover:border-brand/40 transition-all"
        >
          Customer menu
          <ExternalLink className="w-3 h-3" />
        </Link>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-ink-3 hover:text-white hover:bg-dark-tertiary transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dark-border hover:border-brand/40 transition-all"
          >
            <div className="w-6 h-6 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand text-xs font-bold">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-xs text-ink-3 max-w-[120px] truncate">
              {userEmail}
            </span>
            <ChevronDown className="w-3 h-3 text-ink-4" />
          </button>

          {userOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-dark-card border border-dark-border rounded-xl shadow-card-lg z-20 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-dark-border">
                  <p className="text-xs text-ink-4 truncate">{userEmail}</p>
                </div>
                <div className="p-1">
                  <Link
                    href="/admin/settings"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-3 hover:text-white hover:bg-dark-tertiary transition-all"
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
