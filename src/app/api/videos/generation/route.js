import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "../../../lib/auth";
import config from "../../../lib/config";
import { prisma } from "../../../lib/prisma";
import { sendJobToPython } from "../../../lib/pythonWorker";
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

    const formData = await request.formData();

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

    if (images.length < 5 || images.length > 6) {
      return NextResponse.json(
        {
          error:
            "Please provide between 5 and 6 property images.",
        },
        { status: 400 }
      );
    }

    for (const image of images) {
      if (!image.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Only image files are allowed." },
          { status: 400 }
        );
      }
    }

    if (logo && !logo.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Logo must be an image." },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // AUTHORITATIVE CREDIT COST
    // ------------------------------------------------

    const creditCost =
      config.ai.videoGenerationCost;

    // Do not trust VIDEO_COST from frontend.

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        credits: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (user.credits < creditCost) {
      return NextResponse.json(
        {
          error: `You need at least ${creditCost} credits.`,
        },
        { status: 402 }
      );
    }

    // ------------------------------------------------
    // CREATE PROJECT
    // ------------------------------------------------

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name:
          property.title ||
          `${property.propertyTypeName || "Property"} Video`,
      },
    });

    // ------------------------------------------------
    // CREATE JOB
    // ------------------------------------------------

    const job = await prisma.generationJob.create({
      data: {
        projectId: project.id,
        type: "VIDEO",
        status: "PROCESSING",
        creditCost,
        settings: {
          property,
          voiceLanguage,
          videoTextLanguage,
          video,
          generateVideoJson:
            formData.get("generateVideoJson") === "true",
          generateVoiceText:
            formData.get("generateVoiceText") === "true",
          generateVideoText:
            formData.get("generateVideoText") === "true",
        },
      },
    });

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

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      const imageUrl = await uploadJobFile(
        job.id,
        image,
        `images/image-${i + 1}-${image.name}`
      );

      const asset = await prisma.asset.create({
        data: {
          projectId: project.id,
          type: "ORIGINAL_IMAGE",
          url: imageUrl,
        },
      });

      inputAssets.push({
        asset,
        sortOrder: i,
      });
    }

    // ------------------------------------------------
    // OPTIONAL LOGO
    // ------------------------------------------------

    let logoUrl = null;

    if (logo) {
      logoUrl = await uploadJobFile(
        job.id,
        logo,
        `logo-${logo.name}`
      );

      const logoAsset = await prisma.asset.create({
        data: {
          projectId: project.id,
          type: "ORIGINAL_IMAGE",
          url: logoUrl,
        },
      });

      inputAssets.push({
        asset: logoAsset,
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
          property,
          voiceLanguage,
          videoTextLanguage,
          video,
          logoUrl,
          imageUrls: inputAssets
            .filter((item) => item.sortOrder !== 999)
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
      logoUrl,
      images: inputAssets
        .filter((item) => item.sortOrder !== 999)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          assetId: item.asset.id,
          url: item.asset.url,
          sortOrder: item.sortOrder,
        })),
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: "processing",
    });

  } catch (error) {
    console.error(
      "Video generation error:",
      error
    );

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

