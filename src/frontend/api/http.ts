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
    let base = process.env.NEXT_PUBLIC_APP_URL || "";
    try {
      const req = typeof eval === "function" ? eval("require") : null;
      if (req) {
        const { cookies, headers: nextHeaders } = req("next/headers");
        const host = nextHeaders().get("host");
        if (host) {
          const proto = nextHeaders().get("x-forwarded-proto") || "http";
          base = `${proto}://${host}`;
        }

        const cookieStore = cookies();
        const cookieHeader = cookieStore.toString();
        console.log("DEBUG apiFetch server-side:", { url: path, base, cookieHeaderLength: cookieHeader.length });
        if (cookieHeader) {
          headers.set("Cookie", cookieHeader);
        }
      }
    } catch (err) {
      console.error("DEBUG apiFetch server-side error:", err);
    }

    if (!base) {
      throw new Error(
        `Runtime Error: NEXT_PUBLIC_APP_URL is missing. Could not determine server-side API base for ${path}.`
      );
    }

    if (path.startsWith("/")) {
      url = `${base}${path}`;
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
      typeof failure.error === 'object' && failure.error !== null ? failure.error.code ?? "INTERNAL_ERROR" : "INTERNAL_ERROR",
      typeof failure.error === 'object' && failure.error !== null ? failure.error.message ?? "Request failed" : (typeof failure.error === 'string' ? failure.error : "Request failed"),
      res.status,
      typeof failure.error === 'object' && failure.error !== null ? (failure.error.details ?? (("fields" in failure.error) ? (failure.error as any).fields : undefined)) : undefined
    );
  }

  return (body as ApiSuccess<T>).data;
}

