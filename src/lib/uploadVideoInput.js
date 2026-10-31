
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const INPUT_BUCKET = process.env.SUPABASE_VIDEO_INPUT_BUCKET;
const SIGNED_URL_LIFETIME_SECONDS = 24 * 60 * 60;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;

  // Support either server-side secret variable name.
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey || !INPUT_BUCKET) {
    throw new Error(
      "Missing SUPABASE_URL, server-side Supabase key, " +
      "or SUPABASE_VIDEO_INPUT_BUCKET configuration."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function sanitizeFileName(name) {
  const cleaned = name
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-150);

  return cleaned || "upload";
}

/**
 * Uploads one temporary video input file.
 *
 * Returns:
 * {
 *   path: "job-id/unique-file-name.jpg",
 *   signedUrl: "https://..."
 * }
 */
export async function uploadVideoInput(jobId, file, requestedName) {
  if (!jobId || !file) {
    throw new Error("A job ID and file are required.");
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      "Each video input file must be between 1 byte and 20 MB."
    );
  }

  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }

  const supabase = getSupabaseAdmin();

  const originalName = sanitizeFileName(
    requestedName || file.name || "upload"
  );

  // Keep each upload unique and grouped by its generation job.
  const path = `${jobId}/${randomUUID()}-${originalName}`;

  const { error: uploadError } = await supabase.storage
    .from(INPUT_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Failed to upload video input: ${uploadError.message}`
    );
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(INPUT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_LIFETIME_SECONDS);

  if (signedUrlError || !data?.signedUrl) {
    // Avoid leaving an uploaded file behind if signing fails.
    const { error: cleanupError } = await supabase.storage
      .from(INPUT_BUCKET)
      .remove([path]);

    if (cleanupError) {
      console.error(
        "Could not clean up file after signed URL creation failed:",
        cleanupError.message
      );
    }

    throw new Error(
      `Failed to create signed URL: ${
        signedUrlError?.message || "No URL returned."
      }`
    );
  }

//   path — the permanent storage location inside your bucket, such as job-id/random-id-house.jpg.
//   signedUrl — a temporary URL that Python can use to download the private image.

  // console.log("Path:", path, "Signed URL:", data.signedUrl);

  return {
    path,
    signedUrl: data.signedUrl,
  };
}

/**
 * Deletes temporary inputs after the final video has been saved.
 */
export async function deleteVideoInputs(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return;
  }

  const supabase = getSupabaseAdmin();

  // Supabase Storage remove accepts a list of paths.
  const uniquePaths = [...new Set(paths)].filter(
    (path) =>
      typeof path === "string" &&
      path.length > 0 &&
      !path.startsWith("/")
  );

  if (uniquePaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage
    .from(INPUT_BUCKET)
    .remove(uniquePaths);

  if (error) {
    throw new Error(
      `Failed to delete temporary video inputs: ${error.message}`
    );
  }
}
