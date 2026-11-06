import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import { validateProfileUrl } from "@/lib/social/profile-url";

export const runtime = "nodejs";

const PLATFORMS = ["FACEBOOK", "INSTAGRAM"];

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { platform: rawPlatform } = await params;
  const platform = rawPlatform.toUpperCase();

  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: "Unsupported platform" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.profileUrl !== "string") {
    return NextResponse.json(
      { error: "Profile URL is required" },
      { status: 400 }
    );
  }

  let profileUrl;

  try {
    profileUrl = validateProfileUrl(
      platform,
      body.profileUrl
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  // A verified connection must not be silently
  // redirected to a different profile by editing a URL.
  const existing = await prisma.socialConnection.findUnique({
    where: {
      userId_platform: { userId, platform },
    },
  });

  if (existing?.status === "CONNECTED") {
    return NextResponse.json(
      {
        error:
          "This account is connected. Use Change Account to authorize a different profile.",
      },
      { status: 409 }
    );
  }

  const connection = await prisma.socialConnection.upsert({
    where: {
      userId_platform: { userId, platform },
    },
    create: {
      userId,
      platform,
      profileUrl,
      status: "NOT_CONNECTED",
    },
    update: {
      profileUrl,
    },
    select: {
      platform: true,
      profileUrl: true,
      status: true,
    },
  });

  return NextResponse.json({ connection });
}


export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Protect the account-changing request against cross-origin calls.
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 }
    );
  }

  const { platform: rawPlatform } = await params;
  const platform = rawPlatform?.toUpperCase();

  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: "Unsupported platform" },
      { status: 400 }
    );
  }

  try {
    // Instagram depends on the connected Facebook Page token.
    // Disconnecting Facebook must also disconnect Instagram.
    const platformsToDisconnect =
      platform === "FACEBOOK"
        ? ["FACEBOOK", "INSTAGRAM"]
        : ["INSTAGRAM"];

    const result = await prisma.socialConnection.updateMany({
      where: {
        userId,
        platform: {
          in: platformsToDisconnect,
        },
      },
      data: {
        status: "NOT_CONNECTED",
        profileUrl: null,
        platformAccountId: null,
        accountName: null,
        username: null,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        grantedScopes: [],
      },
    });

    return NextResponse.json({
      success: true,
      disconnected: platformsToDisconnect,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Social account disconnect failed:", error.name);

    return NextResponse.json(
      { error: "Unable to disconnect social account" },
      { status: 500 }
    );
  }
}
