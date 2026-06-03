export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  admin: {
    dashboard: "/admin",
    orders: "/admin/orders",
    tables: "/admin/tables",
    menu: "/admin/menu",
    menuAr: "/admin/menu/ar",
    billing: "/admin/billing",
    settings: "/admin/settings",
  },
  kitchen: (restaurantId: string) => `/kitchen/${restaurantId}`,
  customer: {
    menu: (slug: string, tableId: string) => `/${slug}/${tableId}`,
    cart: (slug: string, tableId: string) => `/${slug}/${tableId}/cart`,
    orders: (slug: string, tableId: string) => `/${slug}/${tableId}/orders`,
    bill: (slug: string, tableId: string) => `/${slug}/${tableId}/bill`,
    ar: (slug: string, tableId: string, dishId: string) =>
      `/${slug}/${tableId}/ar/${dishId}`,
  },
} as const;
