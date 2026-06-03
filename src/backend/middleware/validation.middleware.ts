import type { z } from "zod";
import { ValidationError } from "@/backend/errors/ValidationError";

export function validate<TSchema extends z.ZodTypeAny>(schema: TSchema, input: unknown): z.infer<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Invalid request payload", result.error.flatten().fieldErrors);
  }
  return result.data;
}
