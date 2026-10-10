import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";
import { generateSlug } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, restaurantName, phone, address, gstNumber, tableCount } = body;

    if (!email || !password || !restaurantName || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 0. Create user bypassing email confirmation
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError || !userData.user) {
      console.error("User creation error:", userError);
      return NextResponse.json({ error: userError?.message || "Failed to create user" }, { status: 400 });
    }

    const userId = userData.user.id;
    const slug = generateSlug(restaurantName);

    // 1. Create restaurant record
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .insert({
        owner_id: userId,
        name: restaurantName.trim(),
        slug,
        phone: phone.replace(/\s/g, ""),
        address: address || null,
        gst_number: gstNumber || null,
      })
      .select()
      .single();

    if (restError) {
      console.error("Restaurant insertion error:", restError);
      return NextResponse.json({ error: restError.message }, { status: 500 });
    }

    // 2. Create staff record for owner
    const { error: staffError } = await supabase.from("staff").insert({
      restaurant_id: restaurant.id,
      user_id: userId,
      name: restaurantName.trim() + " Admin",
      role: "admin",
      phone: phone.replace(/\s/g, ""),
      is_active: true,
    });

    if (staffError) {
      console.error("Staff insertion error:", staffError);
    }

    // 3. Create tables
    const count = parseInt(tableCount);
    if (!isNaN(count) && count > 0) {
      const tables = Array.from({ length: count }, (_, i) => ({
        restaurant_id: restaurant.id,
        table_number: `T${i + 1}`,
        seating_capacity: 4,
        table_type: "regular",
        status: "available",
        floor: "Ground Floor",
      }));

      const { error: tablesError } = await supabase.from("restaurant_tables").insert(tables);
      if (tablesError) {
        console.error("Tables insertion error:", tablesError);
      }
    }

    return NextResponse.json({ success: true, restaurant });
  } catch (err: any) {
    console.error("Setup restaurant error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
