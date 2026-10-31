
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  try {
    const { assetId } = await params;

    // 1. Authenticate user
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Find current user
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 3. Verify asset ownership
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        project: {
          userId: user.id,
        },
        type: {
          in: ["GENERATED_IMAGE", "VIDEO"],
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    // 4. Soft delete asset
    await prisma.asset.update({
      where: {
        id: asset.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Asset removed from gallery",
    });

  } catch (error) {
    console.error("Gallery DELETE error:", error);

    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
