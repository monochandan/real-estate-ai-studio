
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { projectId, photoId } = await params;

    await prisma.$transaction(async (tx) => {
      // Use the same lock as photo uploads and reordering.
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

      const photo = await tx.propertyPhoto.findFirst({
        where: {
          id: photoId,
          projectId,
        },
      });

      if (!photo) {
        throw new Error("PHOTO_NOT_FOUND");
      }

      // Delete the project photo record.
      // Keep the underlying Asset and storage file for now,
      // because other records may reference them.
      await tx.propertyPhoto.delete({
        where: { id: photo.id },
      });

      // Close the ordering gap safely.
      const remainingPhotos = await tx.propertyPhoto.findMany({
        where: { projectId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true },
      });

      const maxOrder = Math.max(
        0,
        ...remainingPhotos.map((item) => item.sortOrder)
      );

      const temporaryBase =
        maxOrder + remainingPhotos.length + 1;

      // Move positions to unused temporary values.
      for (let i = 0; i < remainingPhotos.length; i++) {
        await tx.propertyPhoto.update({
          where: { id: remainingPhotos[i].id },
          data: { sortOrder: temporaryBase + i },
        });
      }

      // Assign consecutive positions: 0, 1, 2...
      for (let i = 0; i < remainingPhotos.length; i++) {
        await tx.propertyPhoto.update({
          where: { id: remainingPhotos[i].id },
          data: { sortOrder: i },
        });
      }
    });

    return NextResponse.json({
      success: true,
      deletedPhotoId: photoId,
    });
  } catch (error) {
    if (error.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (error.message === "PHOTO_NOT_FOUND") {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    console.error("Delete property photo failed:", error);

    return NextResponse.json(
      { error: "Could not delete photo." },
      { status: 500 }
    );
  }
}
