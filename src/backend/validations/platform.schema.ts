import { z } from "zod";

export const updateRestaurantActivationSchema = z.object({
  restaurantId: z.string().uuid(),
  isActive: z.boolean(),
});

export type UpdateRestaurantActivationDTO = z.infer<typeof updateRestaurantActivationSchema>;

