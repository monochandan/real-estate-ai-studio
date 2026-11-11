

// This version checks authentication, project ownership, file size, 
// and actual image-file signatures. It also deletes the uploaded file 
// if saving the database records fails.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { randomUUID } from "node:crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const BUCKET =
   process.env.SUPABASE_IMAGE_BUCKET || "property-image";

const MAX_BYTES = 10 * 1024 * 1024;

function detectImageType(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return { mime: "image/png", ext: "png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const contentLength = Number(
      request.headers.get("content-length")
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_BYTES + 1024 * 1024
    ) {
      return NextResponse.json(
        { error: "Upload exceeds the size limit" },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be between 1 byte and 10 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(buffer);

    if (!detected || file.type !== detected.mime) {
      return NextResponse.json(
        { error: "Only valid JPEG, PNG, or WebP images are allowed" },
        { status: 400 }
      );
    }

    const storagePath =
      `${session.user.id}/${projectId}/originals/` +
      `${randomUUID()}.${detected.ext}`;

    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: detected.mime,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Property photo upload failed:", uploadError);

      return NextResponse.json(
        { error: "Could not upload image" },
        { status: 502 }
      );
    }

    let photo;

    try {
      photo = await prisma.$transaction(async (tx) => {
        // Serialize uploads for the same project so sortOrder
        // stays unique even if requests arrive concurrently.
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtext(${projectId})
          )
        `;

        // Recheck ownership inside the transaction.
        const ownedProject = await tx.project.findFirst({
          where: {
            id: projectId,
            userId: session.user.id,
          },
          select: { id: true },
        });

        if (!ownedProject) {
          throw new Error("PROJECT_NOT_FOUND");
        }

        const lastPhoto = await tx.propertyPhoto.findFirst({
          where: { projectId },
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true },
        });

        const nextSortOrder =
          lastPhoto ? lastPhoto.sortOrder + 1 : 0;

        const asset = await tx.asset.create({
          data: {
            projectId,
            type: "ORIGINAL_IMAGE",
            // Internal locator, not a public URL.
            url: `storage://${BUCKET}/${storagePath}`,
            storagePath,
          },
        });

        return tx.propertyPhoto.create({
          data: {
            projectId,
            originalAssetId: asset.id,
            selectedAssetId: asset.id,
            sortOrder: nextSortOrder,
          },
          select: {
            id: true,
            projectId: true,
            originalAssetId: true,
            selectedAssetId: true,
            sortOrder: true,
            roomType: true,
            createdAt: true,
          },
        });
      });
    } catch (dbError) {
      // Compensating cleanup if database saving fails.
      const { error: cleanupError } = await supabase.storage
        .from(BUCKET)
        .remove([storagePath]);

      if (cleanupError) {
        console.error(
          "Orphaned property photo requires cleanup:",
          storagePath,
          cleanupError
        );
      }

      if (dbError.message === "PROJECT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      throw dbError;
    }

    const { data: signed, error: signedError } =
      await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 600);

    if (signedError) {
      console.error(
        "Photo saved, but preview signing failed:",
        signedError
      );
    }

    return NextResponse.json(
      {
        success: true,
        photo: {
          ...photo,
          previewUrl: signedError
            ? null
            : signed?.signedUrl ?? null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create property photo failed:", error);

    return NextResponse.json(
      { error: "Could not save property photo" },
      { status: 500 }
    );
  }
}
