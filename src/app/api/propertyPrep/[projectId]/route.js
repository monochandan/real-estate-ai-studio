
// load an existing project, its ordered photos, and video settings. 
// This allows agents to close the browser and resume later.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { PROPERTY_IMAGE_BUCKET } from "@/lib/propertyPrepStorage";
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

    const { projectId } = await params;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        videoSettings: true,
        createdAt: true,
        updatedAt: true,
        propertyPhotos: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            sortOrder: true,
            roomType: true,
            roomTypeSource: true,
            analysis: true,
            originalAssetId: true,
            selectedAssetId: true,
            originalAsset: {
              select: {
                id: true,
                type: true,
                createdAt: true,
              },
            },
            selectedAsset: {
              select: {
                id: true,
                type: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // SUPABASE_IMAGE_BUCKET="property-image"
    const supabase = getSupabaseAdmin();
    const bucket =
    process.env.SUPABASE_IMAGE_BUCKET || "property-image";

    const photosWithPreviews = await Promise.all(
        project.propertyPhotos.map(async (photo) => {
            const asset = await prisma.asset.findFirst({
            where: {
                id: photo.selectedAssetId,
                projectId,
                deletedAt: null,
            },
            select: {
                storagePath: true,
            },
            });

        if (!asset?.storagePath) {
        return { ...photo, previewUrl: null };
        }

        const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(asset.storagePath, 600);

        return {
        ...photo,
        previewUrl: error
            ? null
            : data?.signedUrl ?? null,
            };
        })
    );

    return NextResponse.json({
    success: true,
    project: {
        ...project,
        propertyPhotos: photosWithPreviews,
    },
    });

  } catch (error) {
    console.error("Get property project failed:", error);

    return NextResponse.json(
      { error: "Could not load project" },
      { status: 500 }
    );
  }
}
