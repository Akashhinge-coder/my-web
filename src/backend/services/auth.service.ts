import { createClient } from "@/config/supabase/server";
import { createAdminClient } from "@/config/supabase/server";

export interface AdminSessionRestaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active?: boolean;
}

export interface AdminSessionDTO {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
  } | null;
  restaurant: AdminSessionRestaurant | null;
  role: string;
}

interface StaffSessionRow {
  restaurant_id: string;
  role: string;
  name: string | null;
  restaurants?: AdminSessionRestaurant | AdminSessionRestaurant[] | null;
}

function unwrapRestaurant(
  value: AdminSessionRestaurant | AdminSessionRestaurant[] | null | undefined
): AdminSessionRestaurant | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export class AuthService {
  /**
   * Resolves the current admin session from the authenticated user's cookie.
   * Returns null restaurant if the user is not authenticated or has no restaurant.
   * NEVER falls back to a demo restaurant or service-role access.
   */
  static async resolveAdminSession(): Promise<AdminSessionDTO> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        authenticated: false,
        user: null,
        restaurant: null,
        role: "admin",
      };
    }

    // Use admin client only for the ownership lookup — this is the bootstrap
    // step before we know which restaurant the user belongs to.
    const admin = createAdminClient();
    const ownedRestaurant = await this.getOwnedRestaurant(admin, user.id);
    const staffRecord = !ownedRestaurant
      ? await this.getStaffRestaurant(admin, user.id)
      : null;

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email ?? "",
      },
      restaurant: ownedRestaurant ?? staffRecord?.restaurant ?? null,
      role: staffRecord?.role ?? "admin",
    };
  }

  private static async getOwnedRestaurant(
    supabase: ReturnType<typeof createAdminClient>,
    userId: string
  ): Promise<AdminSessionRestaurant | null> {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, logo_url, is_active")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as AdminSessionRestaurant | null;
  }

  private static async getStaffRestaurant(
    supabase: ReturnType<typeof createAdminClient>,
    userId: string
  ): Promise<{ restaurant: AdminSessionRestaurant; role: string } | null> {
    const { data, error } = await supabase
      .from("staff")
      .select("restaurant_id, role, name, restaurants(id, name, slug, logo_url)")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    const row = data as unknown as StaffSessionRow | null;
    const restaurant = unwrapRestaurant(row?.restaurants);
    if (!row || !restaurant) return null;

    return {
      restaurant,
      role: row.role,
    };
  }
}
