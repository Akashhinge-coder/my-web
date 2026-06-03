"use client";
import { useEffect, useState } from "react";
import { platformApi } from "@/frontend/api/platform";
import { formatDate, formatINRCompact, cn } from "@/lib/utils";
import { CheckCircle, Eye, Loader2, ShoppingBag, Store, TrendingUp, XCircle } from "lucide-react";
import type { PlatformRestaurant, PlatformStats } from "@/types/platform";

export default function SuperAdminPage() {
  const [restaurants, setRestaurants] = useState<PlatformRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats>({ total: 0, active: 0, orders: 0, revenue: 0 });

  useEffect(() => {
    async function load() {
      const dashboard = await platformApi.getDashboard();
      setRestaurants(dashboard.restaurants);
      setStats(dashboard.stats);
      setLoading(false);
    }
    void load();
  }, []);

  async function toggleRestaurant(id: string, current: boolean) {
    const updated = await platformApi.setRestaurantActive(id, !current);
    setRestaurants((items) => items.map((item) => (item.id === id ? updated : item)));
    setStats((currentStats) => ({
      ...currentStats,
      active: currentStats.active + (updated.is_active ? 1 : -1),
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="border-b border-dark-border px-8 py-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold bg-brand">M</div>
        <div>
          <p className="font-display font-semibold text-lg">MENUARA</p>
          <p className="text-xs text-ink-4">Super Admin - Platform Dashboard</p>
        </div>
      </div>
      <div className="p-8 space-y-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Restaurants", value: stats.total.toString(), icon: Store },
            { label: "Active", value: stats.active.toString(), icon: CheckCircle },
            { label: "Total Orders", value: stats.orders.toLocaleString(), icon: ShoppingBag },
            { label: "Platform Revenue", value: formatINRCompact(stats.revenue), icon: TrendingUp },
          ].map((stat) => (
            <div key={stat.label} className="card-dark p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="section-label">{stat.label}</p>
                <stat.icon className="w-5 h-5 text-brand" />
              </div>
              <p className="text-3xl font-display font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-white mb-4">All Restaurants</h2>
          <div className="space-y-3">
            {restaurants.map((restaurant) => (
              <div key={restaurant.id} className={cn("card-dark p-4 flex items-center gap-4", !restaurant.is_active && "opacity-50")}>
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold">
                  {restaurant.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{restaurant.name}</p>
                  <div className="flex items-center gap-3 text-xs text-ink-4">
                    <span>menuara.app/{restaurant.slug}</span>
                    <span>{restaurant.phone}</span>
                    <span>Joined {formatDate(restaurant.created_at)}</span>
                  </div>
                </div>
                <a href={`/${restaurant.slug}/preview`} target="_blank" className="p-2 rounded-xl text-ink-4 hover:text-white hover:bg-dark-tertiary transition-all">
                  <Eye className="w-4 h-4" />
                </a>
                <button type="button" onClick={() => toggleRestaurant(restaurant.id, restaurant.is_active)} className="p-2 rounded-xl text-ink-4 hover:text-white hover:bg-dark-tertiary transition-all">
                  {restaurant.is_active ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
