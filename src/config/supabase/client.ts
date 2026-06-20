import { createBrowserClient } from "@supabase/ssr";

// Use safe placeholder fallbacks at SSR/build time so Next.js prerendering
// doesn't throw when env vars are absent. Auth methods are never called
// during SSR — they only run in event handlers and useEffect (browser only).
export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://placeholder.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "placeholder-anon-key";
  return createBrowserClient(url, key);
}
