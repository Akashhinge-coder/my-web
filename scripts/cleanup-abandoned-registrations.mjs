import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(".env.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ Missing .env.local file.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
  if (match) {
    let value = match[2]?.trim() || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Supabase keys missing in .env.local");
  process.exit(1);
}

const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("=== ABANDONED REGISTRATION CLEANUP AUDIT ===");
  
  // 1. Fetch all restaurant owner IDs
  const { data: restaurants, error: restErr } = await sbAdmin
    .from("restaurants")
    .select("owner_id");
  
  if (restErr) {
    console.error("❌ Failed to fetch restaurants:", restErr.message);
    process.exit(1);
  }
  
  const ownerIds = new Set(restaurants.map(r => r.owner_id));
  console.log(`- Loaded ${ownerIds.size} active restaurant owners from public.restaurants`);

  // 2. Fetch all auth users
  // Note: listUsers returns paginated results, default page size is 50. In large DBs, page through them.
  let page = 1;
  let allUsers = [];
  while (true) {
    const { data: { users }, error: userErr } = await sbAdmin.auth.admin.listUsers({
      page,
      perPage: 100
    });
    
    if (userErr) {
      console.error("❌ Failed to list auth users:", userErr.message);
      process.exit(1);
    }
    
    if (!users || users.length === 0) break;
    allUsers = allUsers.concat(users);
    page++;
  }
  
  console.log(`- Loaded ${allUsers.length} total auth users from Supabase Auth`);

  // 3. Filter for abandoned users (created > 24 hours ago, not in restaurants)
  const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
  const abandonedUsers = allUsers.filter(user => {
    const isOwner = ownerIds.has(user.id);
    const isOlderThanCutoff = new Date(user.created_at).getTime() < cutoffTime;
    return !isOwner && isOlderThanCutoff;
  });

  console.log(`- Identified ${abandonedUsers.length} abandoned auth users (created > 24h ago with no restaurant record)`);

  if (abandonedUsers.length === 0) {
    console.log("✅ No abandoned registrations need cleanup.");
    return;
  }

  // 4. Perform deletion
  console.log("🧹 Deleting abandoned users...");
  for (const user of abandonedUsers) {
    const { error: delErr } = await sbAdmin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error(`  ❌ Failed to delete user ${user.email} (${user.id}):`, delErr.message);
    } else {
      console.log(`  ✅ Cleaned up abandoned user: ${user.email} (${user.id})`);
    }
  }
  console.log("=== CLEANUP RUN COMPLETE ===");
}

main().catch(err => {
  console.error("Fatal error during cleanup job:", err);
  process.exit(1);
});
