import { z } from "zod";

const foodTypeSchema = z.enum(["veg", "non_veg", "vegan", "jain"]);
const dishSizeSchema = z.enum(["S", "M", "L"]);

export const listMenuQuerySchema = z
  .object({
    restaurantId: z.string().uuid().optional(),
    slug: z.string().min(1).optional(),
    tableId: z.string().uuid().optional(),
    view: z.enum(["customer", "admin"]).default("admin"),
    mode: z.enum(["preview"]).optional(),
  })
  .refine((data) => Boolean(data.restaurantId || data.slug), {
    message: "restaurantId or slug is required",
    path: ["restaurantId"],
  });

export type ListMenuQuery = z.infer<typeof listMenuQuerySchema>;

export const restaurantScopeQuerySchema = z.object({
  restaurantId: z.string().uuid(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(80),
  nameHindi: z.string().max(80).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional().nullable();

export const createDishSchema = z.object({
  name: z.string().min(1).max(120),
  nameHindi: z.string().max(120).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  descriptionHindi: z.string().max(1000).optional().nullable(),
  price: z.coerce.number().positive().max(999_999),
  categoryId: z.string().uuid(),
  foodType: foodTypeSchema,
  spiceLevel: z.number().int().min(0).max(5).default(2),
  isAvailable: z.boolean().default(true),
  isSpecial: z.boolean().default(false),
  allergyTags: z.array(z.string().max(40)).default([]),
  dishSize: dishSizeSchema.default("M"),
  imageUrl: optionalUrl,
  imageFocusX: z.number().min(0).max(1).default(0.5),
  imageFocusY: z.number().min(0).max(1).default(0.5),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateDishSchema = createDishSchema.partial();

export type CreateDishDTO = z.infer<typeof createDishSchema>;
export type UpdateDishDTO = z.infer<typeof updateDishSchema>;

export const toggleDishAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const upsertArAssetSchema = z.object({
  angleFront: optionalUrl,
  angleBack: optionalUrl,
  angleLeft: optionalUrl,
  angleRight: optionalUrl,
  angleTop: optionalUrl,
  isPublished: z.boolean().optional(),
});

export type UpsertArAssetDTO = z.infer<typeof upsertArAssetSchema>;

export const createComboSchema = z.object({
  name: z.string().min(1).max(120),
  comboPrice: z.coerce.number().positive().max(999_999),
  dishIds: z.array(z.string().uuid()).min(2).max(20),
  isActive: z.boolean().default(true),
});

export const updateComboSchema = createComboSchema.partial();

export type CreateComboDTO = z.infer<typeof createComboSchema>;
export type UpdateComboDTO = z.infer<typeof updateComboSchema>;
