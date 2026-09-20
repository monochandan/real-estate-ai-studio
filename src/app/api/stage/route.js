import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { UserService } from "../../../lib/services/user";
import config from "../../../lib/config";

const FALLBACK_STAGED_IMAGES = {
  "living-room": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=800",
  "bedroom":     "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=800",
  "kitchen":     "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=800",
  "office":      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800",
  "dining-room": "https://images.unsplash.com/photo-1617806118233-18e1db207f62?q=80&w=800",
  "bathroom":    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=800",
};

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { roomType, designStyle, originalImage, userPrompt } = body;

    if (!originalImage) {
      return new NextResponse("Original image is required", { status: 400 });
    }

    const headerApiKey = req.headers.get("x-custom-api-key");
    const customApiKey = headerApiKey || body.customApiKey || session.user.customApiKey || null;
    const isUsingCustomKey = Boolean(customApiKey && customApiKey.trim().length > 0);

    // Cost logic: 6 credits (0 if custom API key active)
    const cost = isUsingCustomKey ? 0 : (config.ai.generationCost || 12);

    // We don't want to charge the user yet.
    // if (!isUsingCustomKey && cost > 0) {
    //   try {
    //     await UserService.deductCredits(session.user.id, cost);
    //   } catch (err) {
    //     return new NextResponse("Insufficient credits", { status: 402 });
    //   }
    // }

    // Check credits before starting the AI job (removed above block, added this one)
    if (!isUsingCustomKey && cost > 0) {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    if (!currentUser || currentUser.credits < cost) {
      return new NextResponse("Insufficient credits", { status: 402 });
    }
  }
  /////////////////////////////////////////////////////

    // Process Staging
    const apiKey = isUsingCustomKey ? customApiKey.trim() : config.ai.apiKey;
    let stagedImage = FALLBACK_STAGED_IMAGES[roomType] || FALLBACK_STAGED_IMAGES["living-room"];
    let requestId = `mock_${Date.now()}`;

    if (apiKey && !apiKey.includes("your_") && apiKey.trim() !== "") {
      try {
        const webhookUrl = `${config.auth.webhook_url}/api/webhook/muapi`;
        const submitRes = await fetch(`https://api.muapi.ai/api/v1/nano-banana-edit?webhook=${encodeURIComponent(webhookUrl)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey
          },
          body: JSON.stringify({
            prompt: userPrompt,
            images_list: [originalImage],
            webhook: webhookUrl
          })
        });

        if (submitRes.ok) {
          const resJson = await submitRes.json();
          if (resJson.request_id) {
            requestId = resJson.request_id;
            
            // Clear initially to support async webhook / dashboard polling if inline polling times out
            stagedImage = "";

            // Poll for result (max 12s, checking every 2s)
            let completed = false;
            let attempts = 0;
            const maxAttempts = 6;
            
            while (!completed && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              attempts++;
              
              try {
                const pollRes = await fetch(`https://api.muapi.ai/api/v1/predictions/${requestId}/result`, {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey
                  }
                });
                
                if (pollRes.ok) {
                  const pollJson = await pollRes.json();
                  const state = pollJson.status || pollJson.state;
                  if (state === "completed" || state === "succeeded") {
                    const outputs = pollJson.outputs || [];
                    const outputUrl = outputs[0] || (typeof pollJson.output === 'string' ? pollJson.output : pollJson.output?.urls?.get);
                    if (outputUrl) {
                      stagedImage = outputUrl;
                      completed = true;
                    }
                  } else if (state === "failed") {
                    console.error("MuAPI prediction failed:", pollJson.error);
                    break;
                  }
                }
              } catch (pollErr) {
                console.error("MuAPI polling error:", pollErr);
              }
            }
          } else if (resJson.output) {
            stagedImage = resJson.output;
          }
        }
      } catch (err) {
        console.warn("MuAPI call failed, falling back to local styled mocks:", err.message);
      }
    }

    // OLD DATA SCHEMA
    // Save records in StagedRoom
    // const isCompleted = stagedImage && stagedImage !== "";
    // const status = isCompleted ? "completed" : "generating";
    
    // const room = await prisma.stagedRoom.create({
    //   // roomType
    //   // designStyle
    //   // originalImage
    //   // userPrompt
    //   data: {
    //     roomType,
    //     designStyle,
    //     originalImage,
    //     stagedImage: isCompleted ? stagedImage : "",
    //     userPrompt,
    //     status,
    //     requestId,
    //     userId: session.user.id
    //   }
    // });

    // return NextResponse.json({ roomId: room.id, stagedImage: room.stagedImage });

    // NEW - check is completed ???
    const isCompleted = stagedImage && stagedImage !== "";

    if (!isCompleted) {
      return NextResponse.json(
        {
          success: false,
          status: "generating",
          requestId,
        },
        { status: 202 }
      );
    }
    // if completed then come this step
    const result = await prisma.$transaction(async (tx) => {
    // 1. Create Project
    const project = await tx.project.create({
      data: {
        userId: session.user.id,
        name: `${roomType || "Room"} Staging`,
      },
    });

    // 2. Save original image
    const originalAsset = await tx.asset.create({
      data: {
        projectId: project.id,
        type: "ORIGINAL_IMAGE",
        url: originalImage,
        roomType,
      },
    });

    // 3. Save staged image
    const stagedAsset = await tx.asset.create({
      data: {
        projectId: project.id,
        type: "GENERATED_IMAGE",
        url: stagedImage,
        roomType,
        sourceAssetId: originalAsset.id,
      },
    });

    // 4. Create completed generation job
    const job = await tx.generationJob.create({
      data: {
        projectId: project.id,
        type: "STAGING",
        status: "COMPLETED",
        requestId,
        creditCost: cost,
        prompt: userPrompt,
        inputAssetId: originalAsset.id,
        outputAssetId: stagedAsset.id,
        creditsDeducted: !isUsingCustomKey,
        completedAt: new Date(),
      },
    });

    // 5. Deduct credits
    let remainingCredits = null;

    if (!isUsingCustomKey && cost > 0) {
      const updatedUser = await tx.user.updateMany({
        where: {
          id: session.user.id,
          credits: {
            gte: cost,
          },
        },
        data: {
          credits: {
            decrement: cost,
          },
        },
      });

      if (updatedUser.count === 0) {
        throw new Error("Insufficient credits");
      }

      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      });

      remainingCredits = user.credits;

      // 6. Save credit transaction
      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -cost,
          type: "GENERATION",
          description: "Room staging",
          jobId: job.id,
        },
      });
    }

    return {
      projectId: project.id,
      jobId: job.id,
      originalImage: originalAsset.url,
      stagedImage: stagedAsset.url,
      credits: remainingCredits,
    };
  });

  return NextResponse.json({
    success: true,
    ...result,
  });

  } catch (error) {
    console.error("[STAGE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
