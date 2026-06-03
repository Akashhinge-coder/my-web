import { z } from "zod";

export const restaurantSettingsSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(10).max(15),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
});

export type RestaurantSettingsDTO = z.infer<typeof restaurantSettingsSchema>;
