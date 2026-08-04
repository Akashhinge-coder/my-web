import { createClient } from "@supabase/supabase-js";
import pkg from "@next/env";
const { loadEnvConfig } = pkg;
import fs from "fs";
import path from "path";
import sharp from "sharp";

// Load environment variables from .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log("Starting batch image compression...");

  const { data: dishes, error } = await supabase
    .from("dishes")
    .select("id, name, image_url");

  if (error) {
    console.error("Error fetching dishes:", error);
    return;
  }

  if (!dishes) {
    console.log("No dishes found.");
    return;
  }

  console.log(`Found ${dishes.length} dishes.`);

  const bucket = "restaurant-assets";
  const { data: bucketData } = await supabase.storage.getBucket(bucket);
  if (!bucketData) {
      console.log(`Bucket ${bucket} not found. Exiting.`);
      return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const dish of dishes) {
    if (!dish.image_url) {
      skipCount++;
      continue;
    }

    // Skip already compressed images if we use a naming convention
    if (dish.image_url.includes("-compressed.")) {
      console.log(`Skipping already compressed image for dish: ${dish.name}`);
      skipCount++;
      continue;
    }

    try {
      console.log(`Processing: ${dish.name} (${dish.id})`);

      // 1. Download image
      const res = await fetch(dish.image_url);
      if (!res.ok) {
        console.error(`Failed to download image for ${dish.name}: ${res.statusText}`);
        errorCount++;
        continue;
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Skip small images (e.g., < 300KB)
      if (buffer.length < 300 * 1024) {
        console.log(`Image is already small enough (${Math.round(buffer.length / 1024)}KB). Skipping.`);
        skipCount++;
        continue;
      }

      // 2. Extract old path
      const publicUrlPrefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
      let oldPath = "";
      if (dish.image_url.startsWith(publicUrlPrefix)) {
        oldPath = dish.image_url.substring(publicUrlPrefix.length);
      } else {
        console.log(`Cannot determine storage path for URL: ${dish.image_url}`);
        errorCount++;
        continue;
      }
      
      // Decode URI component because URL might have %20 etc.
      oldPath = decodeURIComponent(oldPath);

      // 3. Compress using sharp
      // Maintain aspect ratio, max width 1000px, without enlarging small images
      const compressedBuffer = await sharp(buffer)
        .resize({ width: 1000, withoutEnlargement: true, fit: "inside" })
        .jpeg({ quality: 80 })
        .toBuffer();

      // 4. Upload compressed image
      const ext = ".jpg";
      const newPath = oldPath.replace(/\.[^/.]+$/, "") + `-compressed-${Date.now()}${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(newPath, compressedBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(newPath);
      const newUrl = publicUrlData.publicUrl;

      // 5. Update database
      const { error: updateError } = await supabase
        .from("dishes")
        .update({ image_url: newUrl })
        .eq("id", dish.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      // 6. Delete old image
      const { error: deleteError } = await supabase.storage.from(bucket).remove([oldPath]);
      if (deleteError) {
        console.warn(`Could not delete old image ${oldPath}: ${deleteError.message}`);
      } else {
        console.log(`Deleted old image: ${oldPath}`);
      }

      console.log(`Successfully compressed image for ${dish.name}. Size reduced from ${Math.round(buffer.length / 1024)}KB to ${Math.round(compressedBuffer.length / 1024)}KB.`);
      successCount++;
    } catch (err: any) {
      console.error(`Error processing ${dish.name}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Successfully compressed: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Done.`);
}

run().catch(console.error);
