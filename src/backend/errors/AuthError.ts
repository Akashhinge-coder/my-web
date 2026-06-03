import { AppError } from "./AppError";

export class AuthError extends AppError {
  constructor(message = "Unauthorized", statusCode = 401, code = "AUTH_ERROR") {
    super(message, statusCode, code);
    this.name = "AuthError";
  }
}
