import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "../../../../lib/auth";
import config from "../../../../lib/config";
import { prisma } from "../../../../lib/prisma";
import { sendJobToPython, WorkerDispatchError } from "../../../../lib/pythonWorker";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { uploadVideoInput } from "../../../../lib/uploadVideoInput";

export const runtime = "nodejs";


async function failGenerationJob(jobId, errorMessage) {
  await prisma.$transaction(async (tx) => {
    const job = await tx.generationJob.findUnique({
      where: { id: jobId },
      include: {
        project: { select: { userId: true } },
      },
    });

    if (!job || job.status !== "PROCESSING") {
      return;
    }

    // Claim the failure and refund only once.
    const claim = await tx.generationJob.updateMany({
      where: {
        id: job.id,
        status: "PROCESSING",
        creditsRefunded: false,
      },
      data: {
        status: "FAILED",
        creditsRefunded: job.creditsDeducted,
        errorMessage: String(errorMessage || "Could not start video generation.").slice(0, 5000),
        completedAt: new Date(),
      },
    });

    if (claim.count !== 1) {
      return;
    }

    if (job.creditsDeducted) {
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
  });
}


export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    console.log("Received form data from video/page.js:");
    const propertyRaw = formData.get("property");
    const videoRaw = formData.get("video");

    if (!propertyRaw || !videoRaw) {
      return NextResponse.json(
        { error: "Missing property or video data." },
        { status: 400 }
      );
    }

    let property;
    let video;

    try {
      property = JSON.parse(propertyRaw);
      video = JSON.parse(videoRaw);
    } catch {
      return NextResponse.json(
        { error: "Invalid property/video JSON." },
        { status: 400 }
      );
    }

    const voiceLanguage =
      formData.get("voiceLanguage") || "en";

    const videoTextLanguage =
      formData.get("videoTextLanguage") || "en";

    const images = formData
      .getAll("images")
      .filter((file) => file instanceof File);

    const logoFile = formData.get("logo");

    const logo =
      logoFile instanceof File
        ? logoFile
        : null;

    // ------------------------------------------------
    // VALIDATION
    // ------------------------------------------------

    // image count check
    if (images.length < 5 || images.length > 6) {
      return NextResponse.json(
        {
          error:
            "Please provide between 5 and 6 property images.",
        },
        { status: 400 }
      );
    }

    // for (const image of images) {
    //   if (!image.type.startsWith("image/")) {
    //     return NextResponse.json(
    //       { error: "Only image files are allowed." },
    //       { status: 400 }
    //     );
    //   }
    // }

    // if (logo && !logo.type.startsWith("image/")) {
    //   return NextResponse.json(
    //     { error: "Logo must be an image." },
    //     { status: 400 }
    //   );
    // }

    //  image type and size validations
    const ALLOWED_IMAGE_TYPES = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB

    for (const image of images) {
      if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
        return NextResponse.json(
          { error: "Images must be JPEG, PNG, or WebP." },
          { status: 400 }
        );
      }

      if (image.size === 0 || image.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "Each image must be between 1 byte and 20 MB." },
          { status: 400 }
        );
      }
    }

    if (logo) {
        if (!ALLOWED_IMAGE_TYPES.has(logo.type)) {
          return NextResponse.json(
            { error: "The logo must be JPEG, PNG, or WebP." },
            { status: 400 }
          );
        }

      if (logo.size === 0 || logo.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "The logo must be between 1 byte and 20 MB." },
          { status: 400 }
        );
      }
    }


    // ------------------------------------------------
    // AUTHORITATIVE CREDIT COST
    // ------------------------------------------------


    const creditCost = config.ai.videoGenerationCost;

    if (!Number.isInteger(creditCost) || creditCost <= 0) {
      return NextResponse.json(
        { error: "Invalid video generation credit cost." },
        { status: 500 }
      );
    }

    const settings = {
      property,
      voiceLanguage,
      videoTextLanguage,
      video,
      generateVideoJson:formData.get("generateVideoJson") === "true",
      generateVoiceText:formData.get("generateVoiceText") === "true",
      generateVideoText:formData.get("generateVideoText") === "true",
    };

    const created = await prisma.$transaction(async (tx) => {
      // Deduct credits only if the user still has enough.
    const debit = await tx.user.updateMany({
        where: {
          id: session.user.id,
          credits: { gte: creditCost },
        },
        data: {
          credits: { decrement: creditCost },
        },
      });

    if (debit.count !== 1) {
      return null;
    }

    const project = await tx.project.create({
      data: {
        userId: session.user.id,
        name:
          property.title ||
          `${property.propertyTypeName || "Property"} Video`,
      },
    });

    const job = await tx.generationJob.create({
      data: {
        projectId: project.id,
        type: "VIDEO",
        status: "PROCESSING",
        creditCost,
        creditsDeducted: true,
        settings,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: session.user.id,
        jobId: job.id,
        amount: -creditCost,
        type: "GENERATION",
        description: "Property video generation",
      },
    });

    return { project, job };
  });

  if (!created) {
    return NextResponse.json(
      { error: `You need at least ${creditCost} credits.` },
      { status: 402 }
    );
  }

  const { project, job } = created;

  try{

    // ------------------------------------------------
    // STORE INPUT FILES
    // ------------------------------------------------

    /*
      IMPORTANT:

      Replace this section with your Supabase Storage
      upload helper.

      For example:

      const imageUrl = await uploadJobFile(
        job.id,
        image,
        "images"
      );
    */


    const inputAssets = [];
    const inputStoragePaths = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      const uploaded = await uploadVideoInput(
        job.id,
        image,
        `image-${i + 1}-${image.name}`
      );

    inputStoragePaths.push(uploaded.path);

    const asset = await prisma.asset.create({
      data: {
        projectId: project.id,
        type: "ORIGINAL_IMAGE",
        url: uploaded.signedUrl,
        storagePath: uploaded.path,
      },
    });

      inputAssets.push({
        asset,
        storagePath: uploaded.path,
        url: uploaded.signedUrl,
        sortOrder: i,
      });
    }

    // ------------------------------------------------
    // OPTIONAL LOGO
    // ------------------------------------------------


    let logoUrl = null;
    let logoStoragePath = null;

    if (logo) {
      const uploaded = await uploadVideoInput(
        job.id,
        logo,
        `logo-${logo.name}`
      );

      logoUrl = uploaded.signedUrl;
      logoStoragePath = uploaded.path;
      inputStoragePaths.push(uploaded.path);

      const logoAsset = await prisma.asset.create({
        data: {
          projectId: project.id,
          type: "ORIGINAL_IMAGE",
          url: uploaded.signedUrl,
          storagePath: uploaded.path,
        },
      });

      inputAssets.push({
        asset: logoAsset,
        storagePath: uploaded.path,
        url: uploaded.signedUrl,
        sortOrder: 999,
      });
    }


    // ------------------------------------------------
    // CREATE JOB INPUT RELATIONS
    // ------------------------------------------------

    await prisma.generationJobInput.createMany({
      data: inputAssets.map((item) => ({
        jobId: job.id,
        assetId: item.asset.id,
        sortOrder: item.sortOrder,
      })),
    });

    // ------------------------------------------------
    // UPDATE JOB WITH MEDIA INFORMATION
    // ------------------------------------------------

    await prisma.generationJob.update({
      where: {
        id: job.id,
      },
      data: {
        settings: {
            ...settings,
            logoUrl,
            logoStoragePath,
            inputStoragePaths,
            imageUrls: inputAssets
              .filter((item) => item.sortOrder !== 999)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => item.asset.url),
          },
        },
    });

    // ------------------------------------------------
    // SEND TO PYTHON WORKER
    // ------------------------------------------------

    await sendJobToPython({
      jobId: job.id,
      property,
      voiceLanguage,
      videoTextLanguage,
      video,
      generateVideoJson: settings.generateVideoJson,
      generateVoiceText: settings.generateVoiceText,
      generateVideoText: settings.generateVideoText,
      logoUrl,
      images: inputAssets
        .filter((item) => item.sortOrder !== 999)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          assetId: item.asset.id,
          url: item.url,
          sortOrder: item.sortOrder,
        })),
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: "processing",
    });


  } catch (error) {
      if (
        error instanceof WorkerDispatchError &&
        error.outcomeUnknown
      ) {
        console.error(
          "Worker dispatch outcome is unknown; leaving job PROCESSING:",
          { jobId: job.id }
        );

        return NextResponse.json({
          success: true,
          jobId: job.id,
          status: "processing",
          outcomeUnknown: true,
          message:
            "The worker's response was interrupted. Check this job's status before retrying.",
        });
      }

      try {
        await failGenerationJob(job.id, error.message);
      } catch (refundError) {
        console.error(
          "Could not mark video generation failed or refund credits:",
          refundError
        );
      }

      throw error;
    }
  } catch (error) {
    if (
      error instanceof WorkerDispatchError &&
      error.outcomeUnknown
    ) {
      return NextResponse.json({
        success: true,
        jobId: null,
        status: "processing",
        message:
          "The worker's response was interrupted. Check the job status before retrying.",
        outcomeUnknown: true,
      });
    }

    console.error("Video generation error:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Could not start video generation.",
      },
      { status: 500 }
    );
  }
}
