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
    let base = "https://menuara.app";
    try {
      const req = typeof eval === "function" ? eval("require") : null;
      if (req) {
        const { cookies, headers: nextHeaders } = req("next/headers");
        const host = nextHeaders().get("host");
        if (host) {
          const proto = nextHeaders().get("x-forwarded-proto") || "http";
          base = `${proto}://${host}`;
        } else if (process.env.NEXT_PUBLIC_APP_URL) {
          base = process.env.NEXT_PUBLIC_APP_URL;
        }

        const cookieStore = cookies();
        const cookieHeader = cookieStore.toString();
        console.log("DEBUG apiFetch server-side:", { url: path, base, cookieHeaderLength: cookieHeader.length });
        if (cookieHeader) {
          headers.set("Cookie", cookieHeader);
        }
      } else if (process.env.NEXT_PUBLIC_APP_URL) {
        base = process.env.NEXT_PUBLIC_APP_URL;
      }
    } catch (err) {
      console.error("DEBUG apiFetch server-side error:", err);
      if (process.env.NEXT_PUBLIC_APP_URL) {
        base = process.env.NEXT_PUBLIC_APP_URL;
      }
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
      failure.error?.code ?? "INTERNAL_ERROR",
      failure.error?.message ?? "Request failed",
      res.status,
      failure.error?.details ?? ("fields" in (failure.error ?? {}) ? (failure.error as { fields?: unknown }).fields : undefined)
    );
  }

  return (body as ApiSuccess<T>).data;
}

