import { z } from "zod";

const phoneSchema = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .refine((value) => /^[6-9]\d{9}$/.test(value), "Enter a valid 10-digit mobile number");

const gstSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => value === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value),
    "Enter a valid GST number"
  )
  .transform((value) => value || undefined);

export const settingsProfileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  address: z.string().trim().max(500).optional().nullable().transform((value) => value || undefined),
  logoUrl: z.string().trim().url().optional().nullable().or(z.literal("")).transform((value) => value || undefined),
  language: z.enum(["en", "hi", "mr", "ta", "te"]),
});

export const settingsTaxUpdateSchema = z.object({
  gstNumber: gstSchema.optional(),
  cgstRate: z.coerce.number().min(0).max(14),
  sgstRate: z.coerce.number().min(0).max(14),
});

export const settingsUpdateSchema = settingsProfileUpdateSchema.merge(settingsTaxUpdateSchema);

export type SettingsProfileUpdateDTO = z.infer<typeof settingsProfileUpdateSchema>;
export type SettingsTaxUpdateDTO = z.infer<typeof settingsTaxUpdateSchema>;
export type SettingsUpdateDTO = z.infer<typeof settingsUpdateSchema>;
