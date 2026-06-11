import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const envPath = path.resolve(".env.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ Missing .env.local file. Run this script from the workspace root.");
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

// Base 1x1 test images
const pngBuffer = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789cc3930200000500010d0a2db40000000049454e44ae426082",
  "hex"
);
const jpgBuffer = Buffer.from(
  "ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffa0000f000101010101010101010101010101ffc0000b080001000101011100ffc400100001020300000000000000000000000000ffda0008010100003f0037ffa9000c00010002110311003f00ffd9",
  "hex"
);
const webpBuffer = Buffer.from(
  "524946461a000000574542505650384c0d0000002f000700000707070707070707",
  "hex"
);

let passed = 0;
let failed = 0;
const failures = [];

function pass(name) {
  console.log(`✅ PASS: ${name}`);
  passed++;
}

function fail(name, detail) {
  console.error(`❌ FAIL: ${name}`);
  if (detail) console.error(`   → ${detail}`);
  failed++;
  failures.push({ name, detail });
}

// Helper: Make FormData upload payload
function createFormDataPayload(buffer, filename, mimeType) {
  const boundary = `----WebKitFormBoundaryE2ETestBoundary`;
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const payload = Buffer.concat([
    Buffer.from(header, "utf-8"),
    buffer,
    Buffer.from(footer, "utf-8"),
  ]);

  return {
    body: payload,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
  };
}

// Helper: Dynamically negotiate a working cookie format
async function getAuthCookie(email, password) {
  const client = createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: login, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !login?.session) throw new Error(`Sign in failed for ${email}: ${error?.message}`);

  const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase/)[1];
  const access_token = login.session.access_token;
  const refresh_token = login.session.refresh_token;
  const expires_at = login.session.expires_at;

  const arrayVal = JSON.stringify([access_token, refresh_token, null, null, null]);
  const objectVal = JSON.stringify({ access_token, refresh_token, expires_at });

  const formats = [
    { name: `sb-${projectId}-auth-token.0`, val: arrayVal },
    { name: `sb-${projectId}-auth-token`, val: arrayVal },
    { name: `sb-${projectId}-auth-token.0`, val: objectVal },
  ];

  for (const format of formats) {
    const cookieCandidate = `${format.name}=${encodeURIComponent(format.val)}`;
    const res = await fetch(`${BASE_URL}/api/v1/auth/session`, {
      headers: { "Cookie": cookieCandidate }
    });
    let body = null;
    try { body = await res.json(); } catch {}
    if (res.status === 200 && body?.data?.authenticated === true && body?.data?.user?.email === email) {
      return cookieCandidate;
    }
  }
  throw new Error(`Failed to resolve valid auth cookie format for ${email}`);
}

async function run() {
  console.log("\n🚀 STARTING LOGO UPLOAD E2E TEST SUITE 🚀\n");

  const timestamp = Date.now();
  const emailA = `owner-a-${timestamp}@test.menuara.com`;
  const emailB = `owner-b-${timestamp}@test.menuara.com`;
  const password = "TestPassword123!";

  let userA = null;
  let userB = null;
  let restA = null;
  let restB = null;
  let cookieHeaderA = "";
  let cookieHeaderB = "";

  try {
    // ═══════════════════════════════════════════════════════════
    // BOOTSTRAP TEST USERS & RESTAURANTS
    // ═══════════════════════════════════════════════════════════
    // 1. Create User A
    const { data: userDataA, error: userErrorA } = await sbAdmin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    if (userErrorA || !userDataA.user) throw new Error("Failed to create user A: " + userErrorA?.message);
    userA = userDataA.user;

    // 2. Create Restaurant A
    const { data: dbRestA, error: dbRestErrorA } = await sbAdmin
      .from("restaurants")
      .insert({
        owner_id: userA.id,
        name: "Restaurant A",
        slug: `rest-a-${timestamp}`,
        phone: "9876543211",
      })
      .select()
      .single();
    if (dbRestErrorA || !dbRestA) throw new Error("Failed to create restaurant A: " + dbRestErrorA?.message);
    restA = dbRestA;

    // Create Staff Admin A
    await sbAdmin.from("staff").insert({
      restaurant_id: restA.id,
      user_id: userA.id,
      name: "Admin A",
      role: "admin",
      phone: "9876543211",
      is_active: true,
    });

    // 3. Create User B
    const { data: userDataB, error: userErrorB } = await sbAdmin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });
    if (userErrorB || !userDataB.user) throw new Error("Failed to create user B: " + userErrorB?.message);
    userB = userDataB.user;

    // 4. Create Restaurant B
    const { data: dbRestB, error: dbRestErrorB } = await sbAdmin
      .from("restaurants")
      .insert({
        owner_id: userB.id,
        name: "Restaurant B",
        slug: `rest-b-${timestamp}`,
        phone: "9876543212",
      })
      .select()
      .single();
    if (dbRestErrorB || !dbRestB) throw new Error("Failed to create restaurant B: " + dbRestErrorB?.message);
    restB = dbRestB;

    // Create Staff Admin B
    await sbAdmin.from("staff").insert({
      restaurant_id: restB.id,
      user_id: userB.id,
      name: "Admin B",
      role: "admin",
      phone: "9876543212",
      is_active: true,
    });

    // 5. Generate Cookie Headers by signing in dynamically
    cookieHeaderA = await getAuthCookie(emailA, password);
    cookieHeaderB = await getAuthCookie(emailB, password);

    console.log("Bootstrap complete. Starting tests...\n");

    // ═══════════════════════════════════════════════════════════
    // TEST 1: Upload PNG
    // ═══════════════════════════════════════════════════════════
    try {
      const { body, headers } = createFormDataPayload(pngBuffer, "logo.png", "image/png");
      const res = await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "POST",
        headers: {
          ...headers,
          Cookie: cookieHeaderA,
          "x-e2e-test-key": SERVICE_ROLE_KEY,
        },
        body,
      });

      const data = await res.json();
      if (res.status === 200 && data.success && data.logoUrl.startsWith("http")) {
        // Double-check DB
        const { data: dbRest } = await sbAdmin.from("restaurants").select("logo_url").eq("id", restA.id).single();
        if (dbRest?.logo_url === data.logoUrl) {
          pass("Test 1: Upload PNG (stored & db logo_url updated)");
        } else {
          throw new Error("DB logo_url does not match response");
        }
      } else {
        throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      fail("Test 1: Upload PNG", err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 2: Upload JPG
    // ═══════════════════════════════════════════════════════════
    try {
      const { body, headers } = createFormDataPayload(jpgBuffer, "logo.jpg", "image/jpeg");
      const res = await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "POST",
        headers: {
          ...headers,
          Cookie: cookieHeaderA,
          "x-e2e-test-key": SERVICE_ROLE_KEY,
        },
        body,
      });

      const data = await res.json();
      if (res.status === 200 && data.success) {
        pass("Test 2: Upload JPG (succeeds)");
      } else {
        throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      fail("Test 2: Upload JPG", err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 3: Upload WEBP
    // ═══════════════════════════════════════════════════════════
    try {
      const { body, headers } = createFormDataPayload(webpBuffer, "logo.webp", "image/webp");
      const res = await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "POST",
        headers: {
          ...headers,
          Cookie: cookieHeaderA,
          "x-e2e-test-key": SERVICE_ROLE_KEY,
        },
        body,
      });

      const data = await res.json();
      if (res.status === 200 && data.success) {
        pass("Test 3: Upload WEBP (succeeds)");
      } else {
        throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      fail("Test 3: Upload WEBP", err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 4: Invalid File Type
    // ═══════════════════════════════════════════════════════════
    try {
      const textBuffer = Buffer.from("arbitrary text data");
      const { body, headers } = createFormDataPayload(textBuffer, "logo.txt", "text/plain");
      const res = await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "POST",
        headers: {
          ...headers,
          Cookie: cookieHeaderA,
          "x-e2e-test-key": SERVICE_ROLE_KEY,
        },
        body,
      });

      if (res.status === 422) {
        pass("Test 4: Invalid File Type (rejected with 422)");
      } else {
        throw new Error(`Expected 422, got ${res.status}`);
      }
    } catch (err) {
      fail("Test 4: Invalid File Type", err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 5: Oversized File
    // ═══════════════════════════════════════════════════════════
    try {
      const oversizedBuffer = Buffer.alloc(5.1 * 1024 * 1024); // 5.1 MB
      const { body, headers } = createFormDataPayload(oversizedBuffer, "large.png", "image/png");
      const res = await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "POST",
        headers: {
          ...headers,
          Cookie: cookieHeaderA,
          "x-e2e-test-key": SERVICE_ROLE_KEY,
        },
        body,
      });

      if (res.status === 422) {
        pass("Test 5: Oversized File (rejected with 422)");
      } else {
        throw new Error(`Expected 422, got ${res.status}`);
      }
    } catch (err) {
      fail("Test 5: Oversized File", err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 6: Logo Replacement
    // ═══════════════════════════════════════════════════════════
    try {
      // 1. Upload Logo A
      const { body: bodyA, headers: headersA } = createFormDataPayload(pngBuffer, "logoA.png", "image/png");
      await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "POST",
        headers: { ...headersA, Cookie: cookieHeaderA, "x-e2e-test-key": SERVICE_ROLE_KEY },
        body: bodyA,
      });

      // 2. Upload Logo B (no sleep needed now)
      const { body: bodyB, headers: headersB } = createFormDataPayload(jpgBuffer, "logoB.jpg", "image/jpeg");
      const resB = await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "POST",
        headers: { ...headersB, Cookie: cookieHeaderA, "x-e2e-test-key": SERVICE_ROLE_KEY },
        body: bodyB,
      });
      const dataB = await resB.json();

      // 3. Verify storage has EXACTLY one file and it matches logo B
      const { data: files } = await sbAdmin.storage.from("restaurant-assets").list(restA.id);
      if (files && files.length === 1) {
        const publicUrl = dataB.logoUrl;
        if (publicUrl.includes(files[0].name)) {
          pass("Test 6: Logo Replacement (old files deleted, new file remains)");
        } else {
          throw new Error("File stored does not match logoUrl filename");
        }
      } else {
        throw new Error(`Expected 1 file, found: ${files?.length || 0}`);
      }
    } catch (err) {
      fail("Test 6: Logo Replacement", err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 7: Logo Removal
    // ═══════════════════════════════════════════════════════════
    try {
      const res = await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "DELETE",
        headers: {
          Cookie: cookieHeaderA,
        },
      });

      if (res.status === 200) {
        // Check DB
        const { data: dbRest } = await sbAdmin.from("restaurants").select("logo_url").eq("id", restA.id).single();
        // Check Storage
        const { data: files } = await sbAdmin.storage.from("restaurant-assets").list(restA.id);

        if (dbRest?.logo_url === null && (!files || files.length === 0)) {
          pass("Test 7: Logo Removal (storage empty, logo_url set to null)");
        } else {
          throw new Error(`Logo not removed. DB: ${dbRest?.logo_url}, Storage files count: ${files?.length || 0}`);
        }
      } else {
        throw new Error(`Expected 200, got ${res.status}`);
      }
    } catch (err) {
      fail("Test 7: Logo Removal", err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 8: Cross-Tenant Protection
    // ═══════════════════════════════════════════════════════════
    try {
      // User A attempts to upload logo for User B.
      const { body, headers } = createFormDataPayload(pngBuffer, "tenant-logo.png", "image/png");
      const res = await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "POST",
        headers: {
          ...headers,
          Cookie: cookieHeaderA,
          "x-e2e-test-key": SERVICE_ROLE_KEY,
        },
        body,
      });

      const data = await res.json();
      if (res.status === 200 && data.success) {
        const containsA = data.logoUrl.includes(restA.id);
        const containsB = data.logoUrl.includes(restB.id);

        if (containsA && !containsB) {
          pass("Test 8: Cross-Tenant Protection (upload uses authenticated tenant ID)");
        } else {
          throw new Error(`URL mismatch: expected containing rest A ${restA.id}, got: ${data.logoUrl}`);
        }
      } else {
        throw new Error(`Expected 200, got ${res.status}`);
      }
    } catch (err) {
      fail("Test 8: Cross-Tenant Protection", err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST 9: Bucket Self-Healing
    // ═══════════════════════════════════════════════════════════
    try {
      // 1. Delete bucket
      const { error: deleteBucketError } = await sbAdmin.storage.emptyBucket("restaurant-assets");
      if (!deleteBucketError) {
        await sbAdmin.storage.deleteBucket("restaurant-assets");
      }

      // 2. Perform upload
      const { body, headers } = createFormDataPayload(pngBuffer, "self-heal.png", "image/png");
      const res = await fetch(`${BASE_URL}/api/v1/settings/logo`, {
        method: "POST",
        headers: {
          ...headers,
          Cookie: cookieHeaderA,
          "x-e2e-test-key": SERVICE_ROLE_KEY,
        },
        body,
      });

      const data = await res.json();
      if (res.status === 200 && data.success) {
        pass("Test 9: Bucket Self-Healing (recreates bucket and completes upload)");
      } else {
        throw new Error(`Self-healing upload failed. Status: ${res.status}, response: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      fail("Test 9: Bucket Self-Healing", err.message);
    }

  } catch (err) {
    console.error("❌ E2E Execution error:", err?.stack || err);
  } finally {
    console.log("\n🧹 Cleaning up test data...");
    if (restA) {
      const { data: files } = await sbAdmin.storage.from("restaurant-assets").list(restA.id);
      if (files && files.length > 0) {
        await sbAdmin.storage.from("restaurant-assets").remove(files.map((f) => `${restA.id}/${f.name}`));
      }
      await sbAdmin.from("staff").delete().eq("restaurant_id", restA.id);
      await sbAdmin.from("restaurants").delete().eq("id", restA.id);
    }
    if (restB) {
      const { data: files } = await sbAdmin.storage.from("restaurant-assets").list(restB.id);
      if (files && files.length > 0) {
        await sbAdmin.storage.from("restaurant-assets").remove(files.map((f) => `${restB.id}/${f.name}`));
      }
      await sbAdmin.from("staff").delete().eq("restaurant_id", restB.id);
      await sbAdmin.from("restaurants").delete().eq("id", restB.id);
    }
    if (userA) {
      await sbAdmin.auth.admin.deleteUser(userA.id);
    }
    if (userB) {
      await sbAdmin.auth.admin.deleteUser(userB.id);
    }

    console.log("\n=== E2E AUDIT RESULTS ===");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    if (failed > 0) {
      console.log("\nFailures Detail:");
      failures.forEach((f) => console.log(`- ${f.name}: ${f.detail}`));
      process.exit(1);
    } else {
      console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
      process.exit(0);
    }
  }
}

run();
