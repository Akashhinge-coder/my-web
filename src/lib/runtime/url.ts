/**
 * Resolves the base URL dynamically based on the execution context.
 * 
 * - Browser: Utilizes `window.location.origin` directly.
 * - Server: Uses host proxy headers (e.g. `x-forwarded-host`) or Vercel preview URLs,
 *           falling back to process.env.NEXT_PUBLIC_APP_URL.
 */
export function getRequestOrigin(request?: Request): string {
  // 1. Browser runtime
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // 2. Server runtime via incoming Request headers
  if (request) {
    const headers = request.headers;
    const proto = headers.get("x-forwarded-proto") || "http";
    const host = headers.get("x-forwarded-host") || headers.get("host");
    if (host) {
      return `${proto}://${host}`;
    }
  }

  // 3. Platform env context (e.g. Vercel deployment preview URL)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 4. Configured base URL environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Safe fallback (no localhost references in production environments)
  return "https://menuara.app";
}
