
//  API must identify the user from the server-side NextAuth session, #
// never from a userId sent by the browser.

// The following examples assume your NextAuth configuration exports 
// authOptions and that your session contains session.user.id. 
// If your current authentication implementation differs, adapt 
// these imports before running the code.

// This route loads the user's social connections and saves whether they want to see publishing prompts.    
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {prisma} from "@/lib/prisma";

export const runtime = "nodejs";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const [connections, preference] = await Promise.all([
    prisma.socialConnection.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        profileUrl: true,
        accountName: true,
        username: true,
        status: true,
      },
    }),

    prisma.socialPreference.findUnique({
      where: { userId },
      select: {
        showPublishingPrompt: true,
      },
    }),
  ]);

  return NextResponse.json({
    connections,
    showPublishingPrompt:
      preference?.showPublishingPrompt ?? true,
  });
}

export async function PATCH(request) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.showPublishingPrompt !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Invalid preference" },
      { status: 400 }
    );
  }

  const preference = await prisma.socialPreference.upsert({
    where: { userId },
    create: {
      userId,
      showPublishingPrompt: body.showPublishingPrompt,
    },
    update: {
      showPublishingPrompt: body.showPublishingPrompt,
    },
  });

  return NextResponse.json({
    showPublishingPrompt: preference.showPublishingPrompt,
  });
}