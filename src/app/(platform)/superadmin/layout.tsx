/**
 * SECURITY: Server-side layout guard for the superadmin route group.
 *
 * This is a React Server Component (RSC) — it runs ONLY on the server,
 * never in the browser. It enforces superadmin access BEFORE any page
 * content is rendered or sent to the client.
 *
 * Protection model:
 *   1. Verify the Supabase session is valid (server-side call to auth.getUser).
 *   2. Verify the user has superadmin privileges (app_metadata or staff table).
 *   3. Redirect to /login for unauthenticated users.
 *   4. Redirect to / for authenticated non-superadmin users (403 implied).
 *   5. Only then render {children}.
 *
 * This replaces the previous model where the page rendered a loading spinner
 * and relied on a client-side API call to 403 — a non-server-enforced model.
 */

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/config/supabase/server";

async function isSuperadmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // SECURITY: Only trust app_metadata (admin-controlled field).
    if (user.app_metadata?.role === "superadmin") return true;

    // Fallback: check staff table via service-role client (bypasses RLS).
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .limit(1);

    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check auth first — get the raw user to differentiate unauthed vs unauthorised
  let hasSession = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    hasSession = !!user;
  } catch {
    hasSession = false;
  }

  if (!hasSession) {
    // Not authenticated at all → redirect to login
    redirect("/login?redirect=/superadmin");
  }

  const superadmin = await isSuperadmin();
  if (!superadmin) {
    // Authenticated but not superadmin → redirect to their own dashboard
    redirect("/admin");
  }

  // User is verified superadmin server-side — render page
  return <>{children}</>;
}
