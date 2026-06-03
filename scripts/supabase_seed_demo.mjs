import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), ".env.local");
const rawEnv = fs.readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  rawEnv
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key, rest.join("=")];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function uuid() {
  return crypto.randomUUID();
}

async function getOrCreateDemoOwner() {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  if (Array.isArray(users?.users) && users.users.length > 0) {
    return users.users[0].id;
  }

  const password = "Demo1234!";
  const email = "demo@menuara.test";

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Menuara Demo Owner" },
  });

  if (error) {
    throw error;
  }

  return data.user.id;
}

async function seedDemoData() {
  console.log("Seeding demo restaurant data...");

  const demoSlug = "menuara-demo";
  const existingRestaurant = await supabase
    .from("restaurants")
    .select("id, slug")
    .eq("slug", demoSlug)
    .maybeSingle();

  if (existingRestaurant.data) {
    const restaurantId = existingRestaurant.data.id;
    const { data: tables, error: tableError } = await supabase
      .from("restaurant_tables")
      .select("id, table_number")
      .eq("restaurant_id", restaurantId)
      .limit(1);

    if (tableError) {
      throw tableError;
    }

    const { data: categories } = await supabase
      .from("categories")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .limit(1);

    const { data: dishes } = await supabase
      .from("dishes")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .limit(1);

    if (tables?.length && categories?.length && dishes?.length) {
      console.log("Demo restaurant already exists.");
      console.log(`Demo slug: ${demoSlug}`);
      console.log(`Sample tableId: ${tables[0].id}`);
      console.log(`Customer URL: ${appUrl}/${demoSlug}/${tables[0].id}`);
      console.log(`Kitchen URL: ${appUrl}/kitchen/${restaurantId}`);
      console.log(`Admin URL: ${appUrl}/admin`);
      return;
    }

    console.log("Found incomplete demo restaurant state. Cleaning up and reseeding...");
    const { error: deleteError } = await supabase.from("restaurants").delete().eq("id", restaurantId);
    if (deleteError) {
      throw deleteError;
    }
  }

  const ownerId = await getOrCreateDemoOwner();

  const restaurantId = uuid();
  const tableIds = [uuid(), uuid(), uuid()];
  const categoryIds = [uuid(), uuid()];
  const dishIds = [uuid(), uuid(), uuid(), uuid()];

  const restaurantPayload = {
    id: restaurantId,
    owner_id: ownerId,
    name: "Menuara Demo Café",
    slug: demoSlug,
    gst_number: "27AAAAA0000A1Z5",
    address: "123 Demo Street, Bengaluru",
    phone: "+91 98765 43210",
    logo_url: "https://images.unsplash.com/photo-1541542684-3a6b4b3f8f36?auto=format&fit=crop&w=256&q=80",
    cgst_rate: 2.5,
    sgst_rate: 2.5,
    currency: "INR",
    is_active: true,
  };

  const tablePayload = [
    {
      id: tableIds[0],
      restaurant_id: restaurantId,
      table_number: "T1",
      seating_capacity: 4,
      table_type: "regular",
      status: "occupied",
      qr_url: `${appUrl}/${demoSlug}/${tableIds[0]}`,
      floor: "Ground Floor",
    },
    {
      id: tableIds[1],
      restaurant_id: restaurantId,
      table_number: "T2",
      seating_capacity: 4,
      table_type: "regular",
      status: "available",
      qr_url: `${appUrl}/${demoSlug}/${tableIds[1]}`,
      floor: "Ground Floor",
    },
    {
      id: tableIds[2],
      restaurant_id: restaurantId,
      table_number: "T3",
      seating_capacity: 6,
      table_type: "booth",
      status: "available",
      qr_url: `${appUrl}/${demoSlug}/${tableIds[2]}`,
      floor: "First Floor",
    },
  ];

  const categoryPayload = [
    {
      id: categoryIds[0],
      restaurant_id: restaurantId,
      name: "Tandoori & Grill",
      sort_order: 0,
      is_active: true,
    },
    {
      id: categoryIds[1],
      restaurant_id: restaurantId,
      name: "Beverages",
      sort_order: 1,
      is_active: true,
    },
  ];

  const dishesPayload = [
    {
      id: dishIds[0],
      restaurant_id: restaurantId,
      category_id: categoryIds[0],
      name: "Paneer Tikka",
      description: "Smoky, spiced paneer cubes grilled to perfection.",
      price: 299.0,
      image_url: "https://images.unsplash.com/photo-1604908177522-29ad5f34ebae?auto=format&fit=crop&w=800&q=80",
      food_type: "veg",
      spice_level: 3,
      is_available: true,
      is_special: true,
      allergy_tags: ["dairy"],
      dish_size: "M",
      ar_enabled: true,
      sort_order: 0,
    },
    {
      id: dishIds[1],
      restaurant_id: restaurantId,
      category_id: categoryIds[0],
      name: "Chicken Seekh Kebab",
      description: "Soft chicken kebabs with aromatic spices.",
      price: 349.0,
      image_url: "https://images.unsplash.com/photo-1604908814074-71b8e5d3b5e0?auto=format&fit=crop&w=800&q=80",
      food_type: "non_veg",
      spice_level: 4,
      is_available: true,
      is_special: false,
      allergy_tags: ["gluten"],
      dish_size: "M",
      ar_enabled: false,
      sort_order: 1,
    },
    {
      id: dishIds[2],
      restaurant_id: restaurantId,
      category_id: categoryIds[1],
      name: "Mango Lassi",
      description: "Creamy mango lassi with a hint of cardamom.",
      price: 159.0,
      image_url: "https://images.unsplash.com/photo-1542444459-db39d3b35401?auto=format&fit=crop&w=800&q=80",
      food_type: "veg",
      spice_level: 0,
      is_available: true,
      is_special: false,
      allergy_tags: ["dairy"],
      dish_size: "M",
      ar_enabled: false,
      sort_order: 2,
    },
    {
      id: dishIds[3],
      restaurant_id: restaurantId,
      category_id: categoryIds[1],
      name: "Masala Chai",
      description: "Warm Indian tea brewed with spices.",
      price: 99.0,
      image_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
      food_type: "veg",
      spice_level: 1,
      is_available: true,
      is_special: false,
      allergy_tags: [],
      dish_size: "M",
      ar_enabled: false,
      sort_order: 3,
    },
  ];

  const sessionId = uuid();
  const orderId = uuid();

  const sessionPayload = {
    id: sessionId,
    restaurant_id: restaurantId,
    table_id: tableIds[0],
    guest_count: 2,
    status: "active",
    total_amount: 648.0,
  };

  const orderPayload = {
    id: orderId,
    session_id: sessionId,
    restaurant_id: restaurantId,
    order_number: "ORD-1001",
    status: "pending",
    source: "table",
    total: 648.0,
    notes: "Please add an extra lemon wedge.",
  };

  const orderItemsPayload = [
    {
      order_id: orderId,
      dish_id: dishIds[0],
      quantity: 1,
      unit_price: 299.0,
      total_price: 299.0,
      notes: "No onion, please.",
      status: "pending",
    },
    {
      order_id: orderId,
      dish_id: dishIds[2],
      quantity: 1,
      unit_price: 159.0,
      total_price: 159.0,
      status: "pending",
    },
    {
      order_id: orderId,
      dish_id: dishIds[3],
      quantity: 1,
      unit_price: 99.0,
      total_price: 99.0,
      status: "pending",
    },
  ];

  const { error: restaurantError } = await supabase.from("restaurants").insert(restaurantPayload);
  if (restaurantError) throw restaurantError;

  const { error: categoriesError } = await supabase.from("categories").insert(categoryPayload);
  if (categoriesError) throw categoriesError;

  const { error: dishesError } = await supabase.from("dishes").insert(dishesPayload);
  if (dishesError) throw dishesError;

  const { error: arError } = await supabase.from("dish_ar_assets").insert({
    dish_id: dishIds[0],
    angle_front: "https://example.com/ar/front.glb",
    angle_back: "https://example.com/ar/back.glb",
    is_published: true,
  });
  if (arError) throw arError;

  const { error: tablesError } = await supabase.from("restaurant_tables").insert(tablePayload);
  if (tablesError) throw tablesError;

  const { error: sessionError } = await supabase.from("sessions").insert(sessionPayload);
  if (sessionError) throw sessionError;

  const { error: tableUpdateError } = await supabase
    .from("restaurant_tables")
    .update({ current_session_id: sessionId })
    .eq("id", tableIds[0]);
  if (tableUpdateError) throw tableUpdateError;

  const { error: orderError } = await supabase.from("orders").insert(orderPayload);
  if (orderError) throw orderError;

  const { error: orderItemsError } = await supabase.from("order_items").insert(orderItemsPayload);
  if (orderItemsError) throw orderItemsError;

  console.log("Demo data seeded successfully.");
  console.log(`Demo slug: ${demoSlug}`);
  console.log(`Sample tableId: ${tableIds[0]}`);
  console.log(`Customer URL: ${appUrl}/${demoSlug}/${tableIds[0]}`);
  console.log(`Kitchen URL: ${appUrl}/kitchen/${restaurantId}`);
  console.log(`Admin URL: ${appUrl}/admin`);
}

seedDemoData().catch((error) => {
  console.error(error);
  process.exit(1);
});
