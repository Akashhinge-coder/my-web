import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/config/supabase/server";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";

export const dynamic = "force-dynamic";

// In-memory map for rate limiting: 1 upload per 3 seconds per restaurant per type
const lastUploads = new Map<string, number>();

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  let restaurantId = "unknown";
  let userId = "unknown";

  try {
    const searchParams = req.nextUrl.searchParams;
    const mediaType = searchParams.get("type") || "hero"; // 'logo' or 'hero'

    if (mediaType !== "logo" && mediaType !== "hero") {
      return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
    }

    // 1. Resolve authentication and tenant context
    const access = await resolveRestaurantAccess();
    restaurantId = access.restaurantId;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    // 2. Storage Abuse Protection: Rate Limiting
    const e2eKey = req.headers.get("x-e2e-test-key");
    const isE2E = e2eKey && e2eKey === process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!isE2E) {
      const now = Date.now();
      const rateLimitKey = `${restaurantId}-${mediaType}`;
      const lastUpload = lastUploads.get(rateLimitKey) || 0;
      if (now - lastUpload < 3000) {
        return NextResponse.json({ error: "Too Many Requests. Please wait 3 seconds." }, { status: 429 });
      }
      lastUploads.set(rateLimitKey, now);
    }

    // 3. Parse and validate multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 422 });
    }

    // 4. File MIME Validation
    const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only PNG, JPEG, and WebP are allowed." }, { status: 422 });
    }

    // 5. File Size Validation (5 MB limit)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
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

    // 7. Upload new file (using serverside timestamped unique filename)
    const ext = file.type.split("/")[1] || "webp";
    const filename = `${mediaType}-${Date.now()}.${ext}`;
    const uploadPath = `${restaurantId}/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("restaurant-assets")
      .upload(uploadPath, buffer, {
        contentType: file.type,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    // 8. Generate public URL and update database
    const { data: { publicUrl } } = admin.storage
      .from("restaurant-assets")
      .getPublicUrl(uploadPath);

    const updateField = mediaType === "logo" ? { logo_url: publicUrl } : { hero_image_url: publicUrl };

    const { error: dbError } = await admin
      .from("restaurants")
      .update(updateField)
      .eq("id", restaurantId);
    if (dbError) throw dbError;

    // 9. Audit Log success
    console.log(JSON.stringify({ event: `${mediaType}_uploaded`, url: publicUrl, restaurantId, userId, timestamp }));

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const timestamp = new Date().toISOString();
  let restaurantId = "unknown";
  let userId = "unknown";

  try {
    const searchParams = req.nextUrl.searchParams;
    const mediaType = searchParams.get("type") || "hero"; 

    if (mediaType !== "logo" && mediaType !== "hero") {
      return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
    }

    const access = await resolveRestaurantAccess();
    restaurantId = access.restaurantId;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const admin = createAdminClient();

    const updateField = mediaType === "logo" ? { logo_url: null } : { hero_image_url: null };

    const { error: dbError } = await admin
      .from("restaurants")
      .update(updateField)
      .eq("id", restaurantId);
    if (dbError) throw dbError;

    console.log(JSON.stringify({ event: `${mediaType}_removed`, restaurantId, userId, timestamp }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Media deletion error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
