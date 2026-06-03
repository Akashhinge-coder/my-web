import { AppError } from "./AppError";

export class ValidationError extends AppError {
  constructor(
    message = "Validation failed",
    public fields?: Record<string, string[] | undefined>
  ) {
    super(message, 422, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
