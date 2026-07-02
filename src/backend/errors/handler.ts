import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/backend/errors/AppError";
import { AuthError } from "@/backend/errors/AuthError";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { ValidationError } from "@/backend/errors/ValidationError";
import { ConflictError } from "@/backend/errors/ConflictError";

export function handleError(error: unknown): NextResponse {
  // Rethrow Next.js dynamic server errors so Next.js can handle them correctly
  if (
    error &&
    typeof error === "object" &&
    (error as any).digest === "DYNAMIC_SERVER_USAGE"
  ) {
    throw error;
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          fields: error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    );
  }

  if (
    error instanceof ValidationError ||
    (error && typeof error === "object" && (error as any).name === "ValidationError")
  ) {
    const err = error as ValidationError;
    return NextResponse.json(
      {
        error: {
          code: err.code || "VALIDATION_ERROR",
          message: err.message,
          fields: err.fields,
        },
      },
      { status: err.statusCode || 422 }
    );
  }

  if (
    error instanceof AuthError ||
    (error && typeof error === "object" && (error as any).name === "AuthError")
  ) {
    const err = error as AuthError;
    return NextResponse.json(
      { error: { code: err.code || "AUTH_ERROR", message: err.message } },
      { status: err.statusCode || 401 }
    );
  }

  if (
    error instanceof NotFoundError ||
    (error && typeof error === "object" && (error as any).name === "NotFoundError")
  ) {
    const err = error as NotFoundError;
    return NextResponse.json(
      { error: { code: err.code || "NOT_FOUND", message: err.message } },
      { status: err.statusCode || 404 }
    );
  }

  if (
    error instanceof ConflictError ||
    (error && typeof error === "object" && (error as any).name === "ConflictError")
  ) {
    const err = error as ConflictError;
    return NextResponse.json(
      { error: { code: err.code || "CONFLICT", message: err.message } },
      { status: err.statusCode || 409 }
    );
  }

  if (
    error instanceof AppError ||
    (error && typeof error === "object" && (error as any).name === "AppError")
  ) {
    const err = error as AppError;
    return NextResponse.json(
      { error: { code: err.code || "APP_ERROR", message: err.message } },
      { status: err.statusCode || 500 }
    );
  }

  // Handle Supabase/PostgreSQL constraint errors
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const pgError = error as { code: string; message: string; details?: string | null };

    if (pgError.code === "23503") {
      return NextResponse.json(
        {
          error: {
            code: "FOREIGN_KEY_VIOLATION",
            message: "This item cannot be deleted because it is referenced by other active or historical records.",
            details: pgError.details || null,
          },
        },
        { status: 409 }
      );
    }

    if (pgError.code === "23505") {
      return NextResponse.json(
        {
          error: {
            code: "UNIQUE_VIOLATION",
            message: "A record with this unique value already exists.",
            details: pgError.details || null,
          },
        },
        { status: 409 }
      );
    }
  }

  console.error("[Unhandled Error]", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 }
  );
}


