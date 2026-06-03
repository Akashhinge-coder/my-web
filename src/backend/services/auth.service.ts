import { createAdminClient, createClient } from "@/config/supabase/server";

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
  restaurant: AdminSessionRestaurant;
  role: string;
}

interface StaffSessionRow {
  restaurant_id: string;
  role: string;
  name: string | null;
  restaurants?: AdminSessionRestaurant | AdminSessionRestaurant[] | null;
}

const FALLBACK_RESTAURANT: AdminSessionRestaurant = {
  id: "",
  name: "MENUARA",
  slug: "",
  logo_url: null,
};

function unwrapRestaurant(
  value: AdminSessionRestaurant | AdminSessionRestaurant[] | null | undefined
): AdminSessionRestaurant | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export class AuthService {
  static async resolveAdminSession(): Promise<AdminSessionDTO> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const ownedRestaurant = user?.id
      ? await this.getOwnedRestaurant(admin, user.id)
      : null;

    const staffRecord = !ownedRestaurant && user?.id
      ? await this.getStaffRestaurant(admin, user.id)
      : null;

    const demoRestaurant = !ownedRestaurant && !staffRecord
      ? await this.getDemoRestaurant(admin)
      : null;

    return {
      authenticated: Boolean(user),
      user: user
        ? {
            id: user.id,
            email: user.email ?? "",
          }
        : null,
      restaurant: ownedRestaurant ?? staffRecord?.restaurant ?? demoRestaurant ?? FALLBACK_RESTAURANT,
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

  private static async getDemoRestaurant(
    supabase: ReturnType<typeof createAdminClient>
  ): Promise<AdminSessionRestaurant | null> {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, logo_url, is_active")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as AdminSessionRestaurant | null;
  }
}
