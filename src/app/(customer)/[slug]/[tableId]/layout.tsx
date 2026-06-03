import { notFound } from "next/navigation";
import { createAdminClient } from "@/config/supabase/server";
import { CartProvider } from "@/frontend/hooks/useCart";

export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string; tableId: string };
}) {
  const supabase = createAdminClient();
  const { slug, tableId } = params;

  // Load restaurant by slug
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, cgst_rate, sgst_rate, language")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!restaurant) notFound();

  // Verify table belongs to this restaurant
  const { data: table } = await supabase
    .from("restaurant_tables")
    .select("id, table_number, seating_capacity, status")
    .eq("id", tableId)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!table) notFound();

  return (
    <CartProvider
      restaurantId={restaurant.id}
      restaurantSlug={restaurant.slug}
      tableId={tableId}
    >
      <div className="min-h-screen bg-surface font-sans">
        {children}
      </div>
    </CartProvider>
  );
}
