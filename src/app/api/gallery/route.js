
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBucket(type) {
  return type === "VIDEO"
    ? process.env.SUPABASE_VIDEO_OUTPUT_BUCKET || "property-video"
    : process.env.SUPABASE_IMAGE_BUCKET || "property-image";
}

export async function GET() {
  try {
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

    const assets = await prisma.asset.findMany({
      where: {
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
        type: true,
        url: true,
        storagePath: true,
        roomType: true,
        createdAt: true,
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const supabase = getSupabaseAdmin();

    const gallery = await Promise.all(
      assets.map(async (asset) => {
        let mediaUrl = asset.url;

        if (asset.storagePath) {
          const bucket = getBucket(asset.type);

          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(asset.storagePath, 3600);

          if (error) {
            console.error("Signed URL error:", asset.id, error);
            mediaUrl = null;
          } else {
            mediaUrl = data.signedUrl;
          }
        }

        return {
          id: asset.id,
          type: asset.type,
          url: mediaUrl,
          roomType: asset.roomType,
          projectName: asset.project.name,
          createdAt: asset.createdAt,
        };
      })
    );

    return NextResponse.json(
      { assets: gallery },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Gallery GET error:", error);

    return NextResponse.json(
      { error: "Failed to load gallery" },
      { status: 500 }
    );
  }
}
