import { AppError } from "./AppError";

export class ConflictError extends AppError {
  constructor(message = "Conflict occurred") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}
