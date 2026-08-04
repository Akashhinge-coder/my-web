import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";

export async function GET() {
  const adminClient = createAdminClient();
  const { data: r } = await adminClient.from("restaurants").select("id, slug").limit(1).single();

  if (!r) return NextResponse.json({ error: "No restaurant" });

  const dto = {
    name: "Test Manager",
    role_id: "manager",
    phone: "1234567890",
  };

  // call api/v1/staff internally? Let's just create here.
  const baseUsername = "testmanager";
  const temporaryPassword = "testPassword123!";
  const email = `${baseUsername}_${r.id}@menuara.staff`;

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (authError) return NextResponse.json({ error: "auth error", authError });

  // Now try to hit the login API using fetch
  const loginRes = await fetch("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: baseUsername,
      password: temporaryPassword,
      restaurantSlug: r.slug,
    })
  });

  const loginData = await loginRes.json();
  
  // Cleanup
  await adminClient.auth.admin.deleteUser(authData.user.id);

  return NextResponse.json({
    status: loginRes.status,
    loginData
  });
}
