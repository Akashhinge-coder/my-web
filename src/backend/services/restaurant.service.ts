import { createClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { RestaurantRepository } from "@/backend/repositories/restaurant.repository";

export class RestaurantService {
  static async getBySlug(slug: string) {
    return RestaurantRepository.getBySlug(slug);
  }

  static async getById(id: string) {
    return RestaurantRepository.getById(id);
  }

  /** Active restaurant for the logged-in owner or staff member. */
  static async getActiveForCurrentUser() {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return RestaurantRepository.getFirst();
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, name, slug, logo_url, is_active")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restaurant) return restaurant;

    const { data: staffRecord } = await supabase
      .from("staff")
      .select("restaurant_id, role_id, restaurants(id, name, slug, logo_url, is_active)")
      .eq("user_id", user.id)
      .maybeSingle();

    const staffRestaurant = (
      staffRecord as { restaurants?: { id: string; name: string; slug: string; logo_url: string | null; is_active: boolean } } | null
    )?.restaurants;

    if (!staffRestaurant) {
      throw new NotFoundError("No restaurant linked to this account");
    }

    return staffRestaurant;
  }
}
