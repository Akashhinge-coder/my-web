"use client";

import AdminSidebar from "@/frontend/components/admin/AdminSidebar";
import AdminTopbar from "@/frontend/components/admin/AdminTopbar";
import { useAdminSession } from "@/frontend/hooks/useAdminSession";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading, error } = useAdminSession();

  const restaurant = session?.restaurant ?? {
    id: "",
    name: "MENUARA",
    slug: "",
    logo_url: null,
  };
  const userRole = session?.role ?? "admin";
  const userEmail = session?.user?.email ?? "";

  return (
    <div className="min-h-screen flex admin-theme" style={{ background: 'var(--admin-bg)' }}>
      <AdminSidebar
        restaurant={restaurant}
        userRole={userRole}
      />

      <div className="flex-1 flex flex-col min-w-0 ml-0 md:ml-60">
        <AdminTopbar
          restaurant={restaurant}
          userEmail={userEmail}
        />
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {loading ? (
            <div className="text-sm text-ink-4">Loading admin session...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
