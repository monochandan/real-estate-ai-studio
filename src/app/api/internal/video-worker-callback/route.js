
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../../../lib/prisma";
import { cleanupVideoInputs } from "../../../../lib/cleanupVideoInputs";
export const runtime = "nodejs";

const SIGNED_URL_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request) {
  const expectedSecret = process.env.NEXTJS_CALLBACK_SECRET;
  const receivedSecret = request.headers.get("x-callback-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body.jobId !== "string" ||
    !body.jobId.trim() ||
    !["completed", "failed"].includes(body.status)
  ) {
    return NextResponse.json(
      { error: "Invalid callback payload" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.generationJob.findUnique({
        where: { id: body.jobId },
        include: {
          project: { select: { userId: true } },
        },
      });

      if (!job) return { kind: "not_found" };

      if (job.status === "COMPLETED" || job.status === "FAILED") {
        return { kind: "already_finished", status: job.status };
      }

      
    if (body.status === "failed") {
          const failed = await tx.generationJob.updateMany({
            where: {
              id: job.id,
              status: "PROCESSING",
              creditsRefunded: job.creditsRefunded,
            },
            data: {
              status: "FAILED",
              creditsRefunded: job.creditsDeducted
                ? true
                : job.creditsRefunded,
              errorMessage:
                typeof body.error === "string"
                  ? body.error.slice(0, 5000)
                  : "Video generation failed.",
              completedAt: new Date(),
            },
          });

          if (failed.count !== 1) {
            return { kind: "already_finished", status: job.status };
          }

          if (job.creditsDeducted && !job.creditsRefunded) {
            await tx.user.update({
              where: { id: job.project.userId },
              data: { credits: { increment: job.creditCost } },
            });

            await tx.creditTransaction.create({
              data: {
                userId: job.project.userId,
                amount: job.creditCost,
                type: "REFUND",
                description: "Refund for failed property video generation",
                jobId: job.id,
              },
            });
          }

          return { kind: "failed" };
        }


      if (
        typeof body.outputPath !== "string" ||
        !body.outputPath.startsWith(`${job.id}/`) ||
        !body.outputPath.endsWith(".mp4") ||
        body.outputPath.includes("..") ||
        body.outputPath.startsWith("/")
      ) {
        throw new Error("Invalid output storage path.");
      }

      return {
        kind: "prepare_completion",
        jobId: job.id,
        projectId: job.projectId,
        userId: job.project.userId,
        outputPath: body.outputPath,
      };
    });

    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "Generation job not found" },
        { status: 404 }
      );
    }

    if (result.kind === "already_finished") {
      return NextResponse.json({
        success: true,
        jobId: body.jobId,
        status: result.status,
        duplicate: true,
      });
    }

    if (result.kind === "failed") {
      return NextResponse.json({
        success: true,
        jobId: body.jobId,
        status: "FAILED",
      });
    }

    const bucket = process.env.SUPABASE_VIDEO_OUTPUT_BUCKET;
    if (!bucket) {
      throw new Error("SUPABASE_VIDEO_OUTPUT_BUCKET is not configured.");
    }

    const supabase = getSupabaseAdmin();
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(
        result.outputPath,
        SIGNED_URL_LIFETIME_SECONDS
      );

    if (signedError || !signedData?.signedUrl) {
      throw new Error(
        `Could not create video URL: ${signedError?.message || "No URL returned."}`
      );
    }


const completed = await prisma.$transaction(async (tx) => {
  const claim = await tx.generationJob.updateMany({
    where: {
      id: result.jobId,
      status: "PROCESSING",
    },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      errorMessage: null,
    },
  });

  if (claim.count !== 1) {
    return { duplicate: true };
  }

  const asset = await tx.asset.create({
    data: {
      projectId: result.projectId,
      type: "VIDEO",
      url: signedData.signedUrl,
      storagePath: result.outputPath,
    },
  });

  await tx.generationJob.update({
    where: { id: result.jobId },
    data: { outputAssetId: asset.id },
  });

  return { duplicate: false, assetId: asset.id };
  });


    if (completed.duplicate) {
      return NextResponse.json({
        success: true,
        jobId: body.jobId,
        duplicate: true,
      });
    }

    return NextResponse.json({
      success: true,
      jobId: body.jobId,
      status: "COMPLETED",
      assetId: completed.assetId,
    });
  } catch (error) {
    console.error("Video worker callback error:", error);

    return NextResponse.json(
      { error: "Could not process worker callback" },
      { status: 500 }
    );
  }
}
