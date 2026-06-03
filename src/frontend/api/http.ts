import type { ApiFailure, ApiResponse, ApiSuccess } from "@/types/api";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let url = path;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (typeof window === "undefined") {
    if (path.startsWith("/")) {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      url = `${base}${path}`;
    }

    try {
      const moduleName = "next/headers";
      const { cookies } = await import(moduleName);
      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();
      if (cookieHeader) {
        headers.set("Cookie", cookieHeader);
      }
    } catch {
      // Ignore if called outside of request context (e.g. during build)
    }
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  let body: ApiResponse<T>;
  if (res.status === 204) {
    body = { data: undefined as unknown as T };
  } else {
    const text = await res.text();
    body = text ? (JSON.parse(text) as ApiResponse<T>) : ({ data: undefined as unknown as T });
  }

  if (!res.ok || "error" in body) {
    const failure = body as ApiFailure;
    throw new ApiClientError(
      failure.error?.code ?? "INTERNAL_ERROR",
      failure.error?.message ?? "Request failed",
      res.status,
      failure.error?.details ?? ("fields" in (failure.error ?? {}) ? (failure.error as { fields?: unknown }).fields : undefined)
    );
  }

  return (body as ApiSuccess<T>).data;
}

