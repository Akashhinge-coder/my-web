#!/usr/bin/env node
/**
 * seed-demo.ts — Creates a real demo account in Supabase.
 *
 * Run with:
 *   npx ts-node scripts/seed-demo.ts
 *
 * This creates:
 *   - User: demo@menuara.com (uses the service-role key to create auth user)
 *   - Restaurant: "Menuara Demo Restaurant"
 *   - Demo menu categories and dishes
 *
 * The demo user then logs in normally via the login page.
 * No privileged backend paths are used at runtime.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEMO_EMAIL = "demo@menuara.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "MenuaraDemo2024!";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🌱 Seeding demo account...");

  // 1. Create or get the demo auth user
  const { data: existingUser } = await supabase.auth.admin.listUsers();
  const existing = existingUser?.users.find((u) => u.email === DEMO_EMAIL);

  let userId: string;
  if (existing) {
    console.log(`✅ Demo user already exists: ${existing.id}`);
    userId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (createError) {
      console.error("❌ Failed to create demo user:", createError.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`✅ Created demo user: ${userId}`);
  }

  // 2. Check if demo restaurant already exists
  const { data: existingRestaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (existingRestaurant) {
    console.log(`✅ Demo restaurant already exists: ${existingRestaurant.id}`);
    return;
  }

  // 3. Create the demo restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .insert({
      owner_id: userId,
      name: "Menuara Demo Restaurant",
      slug: "menuara-demo",
      phone: "+91 98765 43210",
      address: "123 Demo Street, Bangalore, Karnataka",
      language: "en",
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      is_active: true,
    })
    .select("id")
    .single();

  if (restaurantError) {
    console.error("❌ Failed to create demo restaurant:", restaurantError.message);
    process.exit(1);
  }
  console.log(`✅ Created demo restaurant: ${restaurant.id}`);

  const restaurantId = restaurant.id;

  // 4. Create demo categories
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .insert([
      { restaurant_id: restaurantId, name: "Starters", sort_order: 1 },
      { restaurant_id: restaurantId, name: "Main Course", sort_order: 2 },
      { restaurant_id: restaurantId, name: "Beverages", sort_order: 3 },
      { restaurant_id: restaurantId, name: "Desserts", sort_order: 4 },
    ])
    .select("id, name");

  if (catError) {
    console.error("❌ Failed to create categories:", catError.message);
    process.exit(1);
  }
  console.log(`✅ Created ${categories.length} demo categories`);

  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // 5. Create demo dishes
  const dishes = [
    { name: "Paneer Tikka", price: 280, food_type: "veg", category_id: catMap["Starters"] },
    { name: "Chicken Wings", price: 340, food_type: "non_veg", category_id: catMap["Starters"] },
    { name: "Veg Spring Rolls", price: 180, food_type: "veg", category_id: catMap["Starters"] },
    { name: "Butter Chicken", price: 380, food_type: "non_veg", category_id: catMap["Main Course"] },
    { name: "Paneer Butter Masala", price: 320, food_type: "veg", category_id: catMap["Main Course"] },
    { name: "Dal Makhani", price: 260, food_type: "veg", category_id: catMap["Main Course"] },
    { name: "Chicken Biryani", price: 420, food_type: "non_veg", category_id: catMap["Main Course"] },
    { name: "Garlic Naan", price: 60, food_type: "veg", category_id: catMap["Main Course"] },
    { name: "Mango Lassi", price: 120, food_type: "veg", category_id: catMap["Beverages"] },
    { name: "Cold Coffee", price: 140, food_type: "veg", category_id: catMap["Beverages"] },
    { name: "Fresh Lime Soda", price: 80, food_type: "veg", category_id: catMap["Beverages"] },
    { name: "Gulab Jamun", price: 100, food_type: "veg", category_id: catMap["Desserts"] },
    { name: "Ice Cream Scoop", price: 120, food_type: "veg", category_id: catMap["Desserts"] },
  ];

  const { error: dishError } = await supabase.from("dishes").insert(
    dishes.map((d, i) => ({ ...d, restaurant_id: restaurantId, sort_order: i }))
  );

  if (dishError) {
    console.error("❌ Failed to create dishes:", dishError.message);
    process.exit(1);
  }
  console.log(`✅ Created ${dishes.length} demo dishes`);

  // 6. Create demo tables
  const tables = Array.from({ length: 8 }, (_, i) => ({
    restaurant_id: restaurantId,
    table_number: `T${i + 1}`,
    seating_capacity: i < 4 ? 4 : 6,
    table_type: "regular" as const,
    status: "available" as const,
    qr_url: `https://menuara.app/menuara-demo/table-${i + 1}`,
  }));

  const { error: tableError } = await supabase.from("restaurant_tables").insert(tables);
  if (tableError) {
    console.error("❌ Failed to create tables:", tableError.message);
    process.exit(1);
  }
  console.log(`✅ Created 8 demo tables`);

  console.log("\n🎉 Demo account seeded successfully!");
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log(`   Slug:     menuara-demo`);
  console.log("\n   Login at: /login");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
