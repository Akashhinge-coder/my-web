import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers["x-session-token"] = sessionToken;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("placeholder.supabase.co")) {
    const errorMsg = "Supabase server client initialized with missing or placeholder environment variables.";
    if (process.env.NODE_ENV === "development") {
      console.error(`[Supabase Server] URL: ${url}, Key present: ${!!anonKey}`);
    }
    throw new Error(errorMsg);
  }

  return createServerClient(url, anonKey, {
      global: {
        headers,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Parameters<typeof cookieStore.set>[2];
          }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from Server Component — can be ignored
          }
        },
      },
    }
  );
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || url.includes("placeholder.supabase.co")) {
    const errorMsg = "Supabase admin client initialized with missing or placeholder environment variables.";
    if (process.env.NODE_ENV === "development") {
      console.error(`[Supabase Admin] URL: ${url}, Service Key present: ${!!serviceKey}`);
    }
    throw new Error(errorMsg);
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

