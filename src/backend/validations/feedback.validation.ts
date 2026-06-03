import { z } from "zod";

export const feedbackListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type FeedbackListQueryDTO = z.infer<typeof feedbackListQuerySchema>;
