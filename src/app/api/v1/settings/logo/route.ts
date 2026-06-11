import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/config/supabase/server";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";

export const dynamic = "force-dynamic";

// In-memory map for rate limiting: 1 upload per 3 seconds per restaurant
const lastUploads = new Map<string, number>();

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  let restaurantId = "unknown";
  let userId = "unknown";

  try {
    // 1. Resolve authentication and tenant context
    const access = await resolveRestaurantAccess();
    restaurantId = access.restaurantId;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log(JSON.stringify({ event: "upload_rejected", reason: "Unauthorized", restaurantId, timestamp }));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    // 2. Storage Abuse Protection: Rate Limiting (Bypassed for E2E tests presenting the service role key)
    const e2eKey = req.headers.get("x-e2e-test-key");
    const isE2E = e2eKey && e2eKey === process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!isE2E) {
      const now = Date.now();
      const lastUpload = lastUploads.get(restaurantId) || 0;
      if (now - lastUpload < 3000) {
        console.log(JSON.stringify({ event: "upload_rejected", reason: "Rate limit exceeded", restaurantId, userId, timestamp }));
        return NextResponse.json({ error: "Too Many Requests. Please wait 3 seconds." }, { status: 429 });
      }
      lastUploads.set(restaurantId, now);
    }

    // 3. Parse and validate multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      console.log(JSON.stringify({ event: "upload_rejected", reason: "Missing file", restaurantId, userId, timestamp }));
      return NextResponse.json({ error: "Missing file" }, { status: 422 });
    }

    // 4. File MIME Validation
    const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      console.log(JSON.stringify({ event: "invalid_file_type", fileType: file.type, restaurantId, userId, timestamp }));
      return NextResponse.json({ error: "Invalid file type. Only PNG, JPEG, and WebP are allowed." }, { status: 422 });
    }

    // 5. File Size Validation (5 MB limit)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      console.log(JSON.stringify({ event: "oversized_file", fileSize: file.size, restaurantId, userId, timestamp }));
      return NextResponse.json({ error: "File size exceeds 5 MB limit." }, { status: 422 });
    }

    const admin = createAdminClient();

    // 6. Bucket Self-Healing
    const { data: buckets, error: listBucketsError } = await admin.storage.listBuckets();
    if (listBucketsError) throw listBucketsError;
    if (!buckets?.some((b) => b.id === "restaurant-assets")) {
      const { error: createBucketError } = await admin.storage.createBucket("restaurant-assets", {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
      if (createBucketError) throw createBucketError;
    }

    // 7. Existing Logo Cleanup (Option A)
    const { data: existingFiles, error: listError } = await admin.storage
      .from("restaurant-assets")
      .list(restaurantId);

    if (listError) {
      console.error("Error listing files for cleanup:", listError.message);
    } else if (existingFiles && existingFiles.length > 0) {
      const toDelete = existingFiles.map((f) => `${restaurantId}/${f.name}`);
      const { error: removeError } = await admin.storage
        .from("restaurant-assets")
        .remove(toDelete);
      if (removeError) {
        console.error("Failed to delete existing logo files:", removeError.message);
      }
    }

    // 8. Upload new file (using serverside timestamped unique filename)
    const ext = file.type.split("/")[1] || "webp";
    const filename = `logo-${Date.now()}.${ext}`;
    const uploadPath = `${restaurantId}/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("restaurant-assets")
      .upload(uploadPath, buffer, {
        contentType: file.type,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    // 9. Generate public URL and update database
    const { data: { publicUrl } } = admin.storage
      .from("restaurant-assets")
      .getPublicUrl(uploadPath);

    const { error: dbError } = await admin
      .from("restaurants")
      .update({ logo_url: publicUrl })
      .eq("id", restaurantId);
    if (dbError) throw dbError;

    // 10. Audit Log success
    console.log(JSON.stringify({ event: "logo_uploaded", logoUrl: publicUrl, restaurantId, userId, timestamp }));

    return NextResponse.json({ success: true, logoUrl: publicUrl });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const timestamp = new Date().toISOString();
  let restaurantId = "unknown";
  let userId = "unknown";

  try {
    // 1. Resolve authentication and tenant context
    const access = await resolveRestaurantAccess();
    restaurantId = access.restaurantId;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log(JSON.stringify({ event: "remove_rejected", reason: "Unauthorized", restaurantId, timestamp }));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const admin = createAdminClient();

    // 2. Delete existing logo files from storage
    const { data: existingFiles, error: listError } = await admin.storage
      .from("restaurant-assets")
      .list(restaurantId);

    if (listError) {
      console.error("Error listing files for delete:", listError.message);
    } else if (existingFiles && existingFiles.length > 0) {
      const toDelete = existingFiles.map((f) => `${restaurantId}/${f.name}`);
      const { error: removeError } = await admin.storage
        .from("restaurant-assets")
        .remove(toDelete);
      if (removeError) {
        console.error("Failed to delete logo files during removal:", removeError.message);
      }
    }

    // 3. Reset logo_url in DB to null
    const { error: dbError } = await admin
      .from("restaurants")
      .update({ logo_url: null })
      .eq("id", restaurantId);
    if (dbError) throw dbError;

    // 4. Audit Log success
    console.log(JSON.stringify({ event: "logo_removed", restaurantId, userId, timestamp }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logo deletion error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
  }
}
