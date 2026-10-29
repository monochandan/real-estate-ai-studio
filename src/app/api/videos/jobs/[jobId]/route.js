
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { jobId } = await params;

    const job = await prisma.generationJob.findFirst({
      where: {
        id: jobId,
        project: {
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        status: true,
        errorMessage: true,
        completedAt: true,
        outputAsset: {
          select: {
            id: true,
            url: true,
            storagePath: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Generation job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status.toLowerCase(),
      error: job.errorMessage,
      completedAt: job.completedAt,
      video: job.outputAsset
        ? {
            assetId: job.outputAsset.id,
            url: job.outputAsset.url,
            storagePath: job.outputAsset.storagePath,
          }
        : null,
    });
  } catch (error) {
    console.error("Video job status error:", error);

    return NextResponse.json(
      { error: "Could not retrieve generation status" },
      { status: 500 }
    );
  }
}
