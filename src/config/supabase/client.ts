import { createBrowserClient } from "@supabase/ssr";

// Use safe placeholder fallbacks at SSR/build time so Next.js prerendering
// doesn't throw when env vars are absent. Auth methods are never called
// during SSR — they only run in event handlers and useEffect (browser only).
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("placeholder.supabase.co")) {
    const errorMsg = "Supabase browser client initialized with missing or placeholder environment variables.";
    // Only log details in development
    if (process.env.NODE_ENV === "development") {
      console.error(`[Supabase Client] URL: ${url}, Key present: ${!!key}`);
    }
    // We throw error here to fail fast if config is broken
    throw new Error(errorMsg);
  }

  return createBrowserClient(url, key);
}
