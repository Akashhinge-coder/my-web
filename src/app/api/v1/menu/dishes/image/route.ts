import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/config/supabase/server";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";

export const dynamic = "force-dynamic";

// Rate limiter: 1 upload per 2 seconds per restaurant
const lastUploads = new Map<string, number>();

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  let restaurantId = "unknown";
  let userId = "unknown";

  try {
    // 1. Auth + tenant context
    const access = await resolveRestaurantAccess();
    restaurantId = access.restaurantId;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    // 2. Rate limiting (bypass for E2E tests)
    const e2eKey = req.headers.get("x-e2e-test-key");
    const isE2E = e2eKey && e2eKey === process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!isE2E) {
      const now = Date.now();
      const last = lastUploads.get(restaurantId) ?? 0;
      if (now - last < 2000) {
        return NextResponse.json(
          { error: "Too many requests. Please wait a moment." },
          { status: 429 }
        );
      }
      lastUploads.set(restaurantId, now);
    }

    // 3. Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 422 });
    }

    // 4. MIME validation
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPEG, WebP, and GIF are allowed." },
        { status: 422 }
      );
    }

    // 5. Size validation (5 MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "File size exceeds 5 MB limit." },
        { status: 422 }
      );
    }

    const admin = createAdminClient();

    // 6. Bucket self-healing
    const { data: buckets, error: listBucketsError } =
      await admin.storage.listBuckets();
    if (listBucketsError) throw listBucketsError;

    const BUCKET = "restaurant-assets";
    if (!buckets?.some((b) => b.id === BUCKET)) {
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5242880,
      });
      if (createErr) throw createErr;
    }

    // 7. Upload to dishes sub-folder
    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const filename = `dish-${Date.now()}.${ext}`;
    const uploadPath = `${restaurantId}/dishes/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(uploadPath, buffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    // 8. Get public URL
    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET).getPublicUrl(uploadPath);

    console.log(
      JSON.stringify({
        event: "dish_image_uploaded",
        publicUrl,
        restaurantId,
        userId,
        timestamp,
      })
    );

    return NextResponse.json({ success: true, imageUrl: publicUrl });
  } catch (error) {
    console.error("Dish image upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
