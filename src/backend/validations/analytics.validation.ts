import { z } from "zod";

export const analyticsRangeSchema = z.object({
  range: z.enum(["7", "30", "90"]).default("7"),
});

export type AnalyticsRangeDTO = z.infer<typeof analyticsRangeSchema>;
