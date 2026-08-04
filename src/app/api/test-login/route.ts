import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  const adminClient = createAdminClient();
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: staffList } = await adminClient.from("staff").select("username, restaurant_id, status").eq("status", "ACTIVE").limit(5);
  if (!staffList || staffList.length === 0) {
    return NextResponse.json({ error: "No staff found" });
  }

  const s = staffList[0];
  const knownPass = "testpass123";
  const newEmail = `testuser_${s.restaurant_id}@menuara.staff`;

  // Create
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: newEmail,
    password: knownPass,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ step: "create", error: authError });
  }

  // Login
  const { data, error } = await supabase.auth.signInWithPassword({
    email: newEmail,
    password: knownPass
  });

  // Cleanup
  await adminClient.auth.admin.deleteUser(authData.user.id);

  if (error) {
    return NextResponse.json({ step: "login", error });
  }

  return NextResponse.json({ step: "success" });
}
