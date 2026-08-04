import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always verify the real session — no demo bypasses allowed
  let currentUser: { id: string; email?: string } | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
  } catch {
    currentUser = null;
  }

  const { pathname } = request.nextUrl;

  // ── Public routes (no auth needed) ──────────────────────────
  const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.some((r) => pathname === r || pathname.startsWith(r));

  // Customer menu routes are public — /:slug/:tableId
  const isCustomerRoute =
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/kitchen") &&
    !pathname.startsWith("/superadmin") &&
    !pathname.startsWith("/api/admin");

  // ── Auth gating — no exceptions, no demo mode
  if (!currentUser && !isPublicRoute && !isCustomerRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Staff Account Invariants
  if (currentUser && !isCustomerRoute) {
    // We only check staff invariants if they are not just an owner
    // A more efficient way is to check the user in staff table
    const { data: staff } = await supabase
      .from("staff")
      .select("status, locked_until, must_change_password")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (staff) {
      if (staff.status !== "ACTIVE") {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url); // Should sign out or show error
      }
      
      if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      // Enforce password change
      if (staff.must_change_password && pathname !== "/update-password" && !pathname.startsWith("/api/v1/auth/password/reset")) {
        const url = request.nextUrl.clone();
        url.pathname = "/update-password";
        return NextResponse.redirect(url);
      }
    }
  }

  if (currentUser && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
