import { notFound } from "next/navigation";
import { createAdminClient } from "@/config/supabase/server";
import { CartProvider } from "@/frontend/hooks/useCart";

export const dynamic = "force-dynamic";

export default async function PreviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const supabase = createAdminClient();
  const { slug } = params;

  // Load restaurant by slug
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, cgst_rate, sgst_rate, language")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!restaurant) notFound();

  return (
    <CartProvider
      restaurantId={restaurant.id}
      restaurantSlug={restaurant.slug}
      tableId="preview"
    >
      <div className="min-h-screen bg-surface font-sans">
        <div className="bg-amber-600 text-white text-xs font-semibold text-center py-2 px-4 sticky top-0 z-50">
          Preview Mode — Orders cannot be placed. Scan a table QR code to order.
        </div>
        {children}
      </div>
    </CartProvider>
  );
}
