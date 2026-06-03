import { useEffect, useMemo, useState } from "react";
import { ordersApi } from "@/frontend/api/orders";
import type { CartItem } from "@/types/domain";
import type { OrderPricingDto } from "@/types/pricing";

const EMPTY_PRICING: OrderPricingDto = {
  subtotal: 0,
  happyHourDiscount: 0,
  couponDiscount: 0,
  loyaltyDiscount: 0,
  taxableAmount: 0,
  cgst: 0,
  sgst: 0,
  gst: 0,
  totalDiscount: 0,
  grandTotal: 0,
};

export function useCartPricing(restaurantId: string | null, items: CartItem[]) {
  const [pricing, setPricing] = useState<OrderPricingDto>(EMPTY_PRICING);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pricingItems = useMemo(
    () => items.map((item) => ({
      dishId: item.dish.id,
      quantity: item.quantity,
      notes: item.notes,
    })),
    [items]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (!restaurantId || pricingItems.length === 0) {
        setPricing(EMPTY_PRICING);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const nextPricing = await ordersApi.quotePricing(restaurantId, { items: pricingItems });
        if (active) setPricing(nextPricing);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to calculate pricing");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [restaurantId, pricingItems]);

  return { pricing, loading, error };
}
