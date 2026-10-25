import { NextResponse } from "next/server";

export async function POST(request) {
  const expectedSecret = process.env.NEXTJS_CALLBACK_SECRET;
  const receivedSecret = request.headers.get("x-callback-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  if (!body.jobId || !["completed", "failed"].includes(body.status)) {
    return NextResponse.json(
      { error: "Invalid callback payload" },
      { status: 400 }
    );
  }

  // TODO: Update the GenerationJob in Prisma here.
  // For "completed", save the video URL and generated text.
  // For "failed", save the error and mark the job as failed.

  return NextResponse.json({
    success: true,
    received: true,
    jobId: body.jobId,
  });
}