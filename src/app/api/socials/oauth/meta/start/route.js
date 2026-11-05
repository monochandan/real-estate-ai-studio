
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { buildMetaAuthorizationUrl } from "@/lib/social/meta";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STATE_COOKIE = "meta_oauth_state";
const STATE_MAX_AGE = 10 * 60;

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const state = crypto.randomBytes(32).toString("hex");

    const stateHash = crypto
      .createHash("sha256")
      .update(state)
      .digest("hex");

    const authorizationUrl = buildMetaAuthorizationUrl(state);

    await prisma.socialOAuthPending.create({
      data: {
        userId: session.user.id,
        selectionKeyHash: stateHash,
        accountsEncrypted: "",
        expiresAt: new Date(Date.now() + STATE_MAX_AGE * 1000),
      },
    });

    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set({
      name: STATE_COOKIE,
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/socials/oauth/meta",
      maxAge: STATE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Meta OAuth start failed:", error.name);

    return NextResponse.json(
      { error: "Could not start Meta authorization." },
      { status: 500 }
    );
  }
}
