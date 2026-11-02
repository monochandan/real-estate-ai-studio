
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function getBucket(type) {
  if (type === "VIDEO") {
    return process.env.SUPABASE_VIDEO_OUTPUT_BUCKET;
  }

  if (type === "GENERATED_IMAGE") {
    return process.env.SUPABASE_IMAGE_BUCKET;
  }

  return null;
}

export async function DELETE(request, { params }) {
  try {
    const { assetId } = await params;

    // 1. Authenticate
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 2. Verify ownership and retrieve storage details.
    // Include soft-deleted assets so earlier deletions
    // can be retried if their database rows still exist.
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        project: { userId: user.id },
        type: { in: ["GENERATED_IMAGE", "VIDEO"] },
      },
      select: {
        id: true,
        type: true,
        storagePath: true,
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    const bucket = getBucket(asset.type);
    const path = asset.storagePath;

    if (!bucket) {
      return NextResponse.json(
        { error: "Storage bucket is not configured" },
        { status: 500 }
      );
    }

    if (
      !path ||
      path.startsWith("/") ||
      path.includes("..") ||
      path.includes("\\")
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid storagePath. Cannot safely delete file.",
        },
        { status: 409 }
      );
    }

    // 3. Check active generation dependencies.
    const activeJobs = await prisma.generationJob.count({
      where: {
        status: "PROCESSING",
        OR: [
          { inputAssetId: asset.id },
          { outputAssetId: asset.id },
          {
            inputAssets: {
              some: { assetId: asset.id },
            },
          },
        ],
      },
    });

    if (activeJobs > 0) {
      return NextResponse.json(
        {
          error:
            "This asset is still used by a processing job.",
        },
        { status: 409 }
      );
    }

    // 4. Check dependent asset versions.
    const dependentVersions = await prisma.asset.count({
      where: { sourceAssetId: asset.id },
    });

    if (dependentVersions > 0) {
      return NextResponse.json(
        {
          error:
            "This asset has dependent versions. Delete them first.",
        },
        { status: 409 }
      );
    }

    // 5. Prevent deleting a shared storage object.
    const sharedAssets = await prisma.asset.count({
      where: {
        id: { not: asset.id },
        type: asset.type,
        storagePath: path,
      },
    });

    if (sharedAssets > 0) {
      return NextResponse.json(
        {
          error:
            "Another asset references the same storage file.",
        },
        { status: 409 }
      );
    }

    console.log("[GALLERY_DELETE_START]", {
      assetId,
      type: asset.type,
      bucket,
      path,
    });

    // 6. Delete from Supabase Storage.
    const supabase = getSupabaseAdmin();

    const { data, error: storageError } =
      await supabase.storage
        .from(bucket)
        .remove([path]);

    if (storageError) {
      console.error(
        "[GALLERY_STORAGE_DELETE_ERROR]",
        storageError
      );

      return NextResponse.json(
        {
          error: `Storage deletion failed: ${storageError.message}`,
        },
        { status: 500 }
      );
    }

    console.log("[GALLERY_STORAGE_DELETE_RESULT]", {
      bucket,
      path,
      data,
    });

    // Supabase can return an empty result for an object
    // that does not exist. Verify before deleting the DB row.
    const segments = path.split("/");
    const filename = segments.pop();
    const folder = segments.join("/");

    const { data: remaining, error: verifyError } =
      await supabase.storage
        .from(bucket)
        .list(folder, { search: filename });

    if (verifyError) {
      throw new Error(
        `Could not verify Storage deletion: ${verifyError.message}`
      );
    }

    if (remaining?.some((item) => item.name === filename)) {
      throw new Error(
        "Video/image still exists in Supabase Storage."
      );
    }

    // 7. Detach historical job references and
    // permanently remove the Asset record.
    await prisma.$transaction(async (tx) => {
      await tx.generationJob.updateMany({
        where: { inputAssetId: asset.id },
        data: { inputAssetId: null },
      });

      await tx.generationJob.updateMany({
        where: { outputAssetId: asset.id },
        data: { outputAssetId: null },
      });

      await tx.generationJobInput.deleteMany({
        where: { assetId: asset.id },
      });

      await tx.asset.delete({
        where: { id: asset.id },
      });
    });

    console.log("[GALLERY_DELETE_SUCCESS]", {
      assetId,
      bucket,
      path,
    });

    return NextResponse.json({
      success: true,
      message: "Asset permanently deleted",
    });
  } catch (error) {
    console.error("[GALLERY_DELETE_FAILED]", error);

    return NextResponse.json(
      {
        error: "Could not permanently delete asset",
      },
      { status: 500 }
    );
  }
}
