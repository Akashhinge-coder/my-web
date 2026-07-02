"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, ChevronDown, ExternalLink, Sun, Moon } from "lucide-react";
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
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check local storage or document class list
    const savedTheme = localStorage.getItem("admin-theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("admin-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("admin-theme", "light");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const restaurantName = restaurant?.name || "MENUARA";
  const restaurantSlug = restaurant?.slug || "";
  const fallbackMenuHref = restaurantSlug ? `/${restaurantSlug}` : "/admin";

  return (
    <header className="sticky top-0 z-20 backdrop-blur-md px-4 md:px-8 py-3 flex items-center justify-between gap-4 border-b border-admin-border-2" style={{ background: 'color-mix(in oklch, var(--admin-card) 85%, transparent)' }}>
      {/* Left — breadcrumb on mobile becomes logo space */}
      <div className="flex items-center gap-3 ml-12 md:ml-0">
        <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: 'var(--admin-faint)' }}>
          <span className="text-foreground font-medium">{restaurantName}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Customer menu link */}
        <Link
          href={fallbackMenuHref}
          target={restaurantSlug ? "_blank" : undefined}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all hover:text-foreground border border-admin-border-2"
          style={{ color: 'var(--admin-subtle)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'color-mix(in oklch, var(--primary) 35%, transparent)'; e.currentTarget.style.color = 'var(--primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--admin-border-2)'; e.currentTarget.style.color = 'var(--admin-subtle)'; }}
        >
          Customer menu
          <ExternalLink className="w-3 h-3" />
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-all hover:text-foreground"
          style={{ color: 'var(--admin-subtle)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in oklch, var(--foreground) 8%, transparent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl transition-all hover:text-foreground"
          style={{ color: 'var(--admin-subtle)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in oklch, var(--foreground) 8%, transparent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-cyan)' }} />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border border-admin-border-2"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in oklch, var(--primary) 35%, transparent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--admin-border-2)'; }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'color-mix(in oklch, var(--primary) 15%, transparent)', border: '1px solid color-mix(in oklch, var(--primary) 30%, transparent)', color: 'var(--accent-cyan)' }}
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
                className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-card-lg z-20 overflow-hidden animate-fade-in bg-admin-card border border-admin-border-2"
              >
                <div className="px-4 py-3 border-b border-admin-border-2">
                  <p className="text-xs truncate" style={{ color: 'var(--admin-faint)' }}>{userEmail}</p>
                </div>
                <div className="p-1">
                  <Link
                    href="/admin/settings"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:text-foreground"
                    style={{ color: 'var(--admin-subtle)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in oklch, var(--foreground) 8%, transparent)'; }}
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
