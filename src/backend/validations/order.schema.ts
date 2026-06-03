import { z } from "zod";

const orderItemInputSchema = z.object({
  dishId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  sessionId: z.string().uuid(),
  items: z.array(orderItemInputSchema).min(1).max(30),
  notes: z.string().max(500).optional(),
  source: z.enum(["table", "zomato", "swiggy"]).optional(),
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;

export const placeOrderSchema = z.object({
  tableId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  items: z.array(orderItemInputSchema).min(1).max(30),
  notes: z.string().max(500).optional(),
  source: z.enum(["table", "zomato", "swiggy"]).optional(),
});

export type PlaceOrderDTO = z.infer<typeof placeOrderSchema>;

export const orderPricingSchema = z.object({
  items: z.array(orderItemInputSchema).min(1).max(30),
  couponCode: z.string().trim().min(1).optional(),
  loyaltyPhone: z.string().trim().optional(),
  loyaltyPointsToRedeem: z.coerce.number().int().positive().optional(),
  timestamp: z.string().datetime().optional(),
});

export type OrderPricingDTO = z.infer<typeof orderPricingSchema>;

/**
 * Admin list orders query — restaurantId is intentionally REMOVED.
 * It must be derived from the authenticated session via resolveRestaurantAccess().
 * Trusting client-supplied restaurantId is a critical cross-tenant vulnerability.
 */
export const listOrdersQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
  scope: z.enum(["today", "kitchen", "session", "all"]).default("all"),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "cooking", "served", "cancelled"]),
});

export type UpdateOrderStatusDTO = z.infer<typeof updateOrderStatusSchema>;

export const sessionOrdersQuerySchema = z.object({
  sessionId: z.string().uuid(),
});

export const billQuerySchema = z.object({
  slug: z.string().min(1),
  tableId: z.string().uuid(),
});
