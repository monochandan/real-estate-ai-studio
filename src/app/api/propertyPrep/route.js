// POST /api/propertyPrep

// Create a draft Project for the authenticated user.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body.name !== "string" ||
      body.name.trim().length < 1 ||
      body.name.trim().length > 120
    ) {
      return NextResponse.json(
        { error: "Project name must be 1–120 characters." },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: body.name.trim(),
        videoSettings: {
          textStyle: "minimal",
          voiceoverEnabled: false,
          musicMode: "auto",
          aspectRatio: "9:16",
          duration: 30,
        },
      },
      select: {
        id: true,
        name: true,
        videoSettings: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, project },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create property project failed:", error);

    return NextResponse.json(
      { error: "Could not create project." },
      { status: 500 }
    );
  }
}
