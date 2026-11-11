
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_ROOM_TYPES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Dining Room",
  "Office",
  "Exterior",
  "Garden",
  "Balcony",
  "Hallway",
  "Garage",
  "Laundry Room",
  "Other",
];

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { projectId, photoId } = await params;
    const body = await request.json().catch(() => null);
    const roomType = body?.roomType;

    if (
      roomType !== null &&
      !ALLOWED_ROOM_TYPES.includes(roomType)
    ) {
      return NextResponse.json(
        { error: "Invalid room type." },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    const result = await prisma.propertyPhoto.updateMany({
      where: {
        id: photoId,
        projectId,
        project: {
          userId: session.user.id,
        },
      },
      data: {
        roomType,
        roomTypeSource: roomType === null ? null : "manual",
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Photo not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      photoId,
      roomType,
      roomTypeSource: roomType === null ? null : "manual",
    });
  } catch (error) {
    console.error("Update room type failed:", error);

    return NextResponse.json(
      { error: "Could not update room type." },
      { status: 500 }
    );
  }
}
