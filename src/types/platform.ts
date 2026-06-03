export interface PlatformRestaurant {
  id: string;
  name: string;
  slug: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export interface PlatformStats {
  total: number;
  active: number;
  orders: number;
  revenue: number;
}

export interface PlatformDashboard {
  restaurants: PlatformRestaurant[];
  stats: PlatformStats;
}

