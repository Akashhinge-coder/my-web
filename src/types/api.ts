export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiSuccess<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiFailure = {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: unknown;
    fields?: Record<string, string[] | undefined>;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
