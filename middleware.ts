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

  // Demo mode: allow viewing protected routes without real login
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  let currentUser: any = null;
  if (demoMode) {
    currentUser = { id: "demo-user-id", email: "demo@menuara.local", role: "admin" };
  } else {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser = user;
    } catch {
      currentUser = null;
    }
  }

  const { pathname } = request.nextUrl;

  // ── Public routes (no auth needed) ──────────────────────────
  const publicRoutes = ["/", "/login", "/register", "/forgot-password"];
  const isPublicRoute = publicRoutes.some((r) => pathname === r || pathname.startsWith(r));

  // Customer menu routes are public — /:slug/:tableId
  const isCustomerRoute =
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/kitchen") &&
    !pathname.startsWith("/superadmin") &&
    !pathname.startsWith("/api/admin");

  // ── Auth gating
  // In demo mode we allow access to protected routes without redirecting to login.
  if (!currentUser && !isPublicRoute && !isCustomerRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
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
