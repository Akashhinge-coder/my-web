import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./AppError";
import { AuthError } from "./AuthError";
import { NotFoundError } from "./NotFoundError";
import { ValidationError } from "./ValidationError";

export function handleError(error: unknown): NextResponse {
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
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          fields: error.fields,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
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

