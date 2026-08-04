import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/backend/errors/AuthError";
import { createAdminClient, createClient } from "@/config/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password, restaurantSlug } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Identifier and password are required" }, { status: 400 });
    }

    const isEmail = identifier.includes("@");
    let loginEmail = identifier;
    let resolvedRestaurantId: string | null = null;

    const adminClient = createAdminClient();

    if (!isEmail) {
      // Resolve username -> email
      if (!restaurantSlug) {
        return NextResponse.json({ error: "Restaurant code is required for staff login" }, { status: 400 });
      }

      // 1. Get restaurant ID from slug
      const { data: restaurant } = await adminClient
        .from("restaurants")
        .select("id")
        .eq("slug", restaurantSlug)
        .single();

      if (!restaurant) {
        return NextResponse.json({ error: "Invalid restaurant code" }, { status: 404 });
      }

      resolvedRestaurantId = restaurant.id;
      loginEmail = `${identifier}_${restaurant.id}@menuara.staff`;
    }

    // Attempt Sign In
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      // Track failed login attempt if it's a staff member
      if (!isEmail && resolvedRestaurantId) {
        const { data: staffData } = await adminClient
          .from("staff")
          .select("id, failed_login_attempts")
          .eq("username", identifier)
          .eq("restaurant_id", resolvedRestaurantId)
          .maybeSingle();

        if (staffData) {
          const newAttempts = (staffData.failed_login_attempts || 0) + 1;
          const updates: any = { failed_login_attempts: newAttempts };
          if (newAttempts >= 5) {
            updates.status = "LOCKED";
            updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          }
          await adminClient.from("staff").update(updates).eq("id", staffData.id);
        }
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check staff invariants after login
    if (!isEmail) {
      const { data: staffData } = await adminClient
        .from("staff")
        .select("id, status, locked_until, must_change_password")
        .eq("user_id", data.user.id)
        .single();

      if (staffData) {
        if (staffData.status !== "ACTIVE") {
          await supabase.auth.signOut();
          return NextResponse.json({ error: "Account is not active" }, { status: 403 });
        }
        if (staffData.locked_until && new Date(staffData.locked_until) > new Date()) {
          await supabase.auth.signOut();
          return NextResponse.json({ error: "Account is locked. Try again later." }, { status: 403 });
        }

        // Reset failed attempts
        await adminClient.from("staff").update({ failed_login_attempts: 0, last_login_at: new Date().toISOString() }).eq("id", staffData.id);

        if (staffData.must_change_password) {
          return NextResponse.json({ success: true, requirePasswordChange: true });
        }
      }
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
