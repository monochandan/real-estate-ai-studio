import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function uploadJobFile(jobId, file, folder) {
  if (!(file instanceof File)) {
    throw new Error("Invalid upload file.");
  }

  const bucket = process.env.SUPABASE_IMAGE_BUCKET;

  if (!bucket) {
    throw new Error("SUPABASE_IMAGE_BUCKET is not configured.");
  }

  const safeFolder = String(folder)
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, "_"))
    .join("/");

  const ext = file.name.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] || "";
  const objectPath = `${jobId}/${safeFolder}/${randomUUID()}${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  // This works if property-image is a PUBLIC bucket.
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(objectPath);

  if (!data?.publicUrl) {
    throw new Error("Could not create the image URL.");
  }

  return data.publicUrl;
}