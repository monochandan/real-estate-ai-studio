
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    const body = await request.json().catch(() => null);
    const photoIds = body?.photoIds;

    if (
      !Array.isArray(photoIds) ||
      photoIds.length === 0 ||
      photoIds.length > 200 ||
      !photoIds.every(
        (id) => typeof id === "string" && id.length > 0
      ) ||
      new Set(photoIds).size !== photoIds.length
    ) {
      return NextResponse.json(
        { error: "Provide a unique ordered list of photo IDs." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Lock the project row. Uploads and reorders must use
      // the same lock strategy to serialize changes.
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${projectId}))
      `;

      const project = await tx.project.findFirst({
        where: {
          id: projectId,
          userId: session.user.id,
        },
        select: { id: true },
      });

      if (!project) {
        throw new Error("PROJECT_NOT_FOUND");
      }

      const photos = await tx.propertyPhoto.findMany({
        where: { projectId },
        select: { id: true, sortOrder: true },
      });

      if (
        photos.length !== photoIds.length ||
        !photos.every((photo) => photoIds.includes(photo.id))
      ) {
        throw new Error("PHOTO_LIST_MISMATCH");
      }

      // Phase 1: Move all positions above the current range.
      // This avoids violating @@unique([projectId, sortOrder]).
      const maxOrder = Math.max(
        0,
        ...photos.map((photo) => photo.sortOrder)
      );

      const temporaryBase = maxOrder + photoIds.length + 1;

      for (let i = 0; i < photoIds.length; i++) {
        await tx.propertyPhoto.update({
          where: { id: photoIds[i] },
          data: { sortOrder: temporaryBase + i },
        });
      }

      // Phase 2: Assign the final consecutive positions.
      for (let i = 0; i < photoIds.length; i++) {
        await tx.propertyPhoto.update({
          where: { id: photoIds[i] },
          data: { sortOrder: i },
        });
      }
    });

    return NextResponse.json({
      success: true,
      photoIds,
    });
  } catch (error) {
    if (error.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (error.message === "PHOTO_LIST_MISMATCH") {
      return NextResponse.json(
        {
          error:
            "The photo list changed. Refresh the project and try again.",
        },
        { status: 409 }
      );
    }

    console.error("Reorder property photos failed:", error);

    return NextResponse.json(
      { error: "Could not reorder photos." },
      { status: 500 }
    );
  }
}
