
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  exchangeMetaCode,
  getLongLivedMetaToken,
  getMetaPages,
} from "@/lib/social/meta";

import { encryptToken } from "@/lib/social/encryption";

export const runtime = "nodejs";

const STATE_COOKIE = "meta_oauth_state";
const SELECTION_MAX_AGE = 10 * 60 * 1000;

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

export async function GET(request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const metaError = url.searchParams.get("error");

  const savedState =
    request.cookies.get(STATE_COOKIE)?.value;

  function redirect(status, extraParams = {}) {
    const destination = new URL("/settings", request.url);

    destination.searchParams.set("meta_status", status);

    for (const [key, value] of Object.entries(extraParams)) {
      destination.searchParams.set(key, value);
    }

    const response = NextResponse.redirect(destination);

    response.cookies.set({
      name: STATE_COOKIE,
      value: "",
      path: "/api/socials/oauth/meta",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  }

  if (metaError) {
    return redirect("authorization_denied");
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirect("unauthorized");
  }

  if (!savedState || !returnedState) {
    return redirect("invalid_state");
  }

  const savedBuffer = Buffer.from(savedState);
  const returnedBuffer = Buffer.from(returnedState);

  if (
    savedBuffer.length !== returnedBuffer.length ||
    !crypto.timingSafeEqual(savedBuffer, returnedBuffer)
  ) {
    return redirect("invalid_state");
  }

  if (!code) {
    return redirect("missing_code");
  }

  const stateHash = hashValue(returnedState);

  // Atomically consume the OAuth state.
  // Only the user who initiated authorization can consume it.
  const pending = await prisma.socialOAuthPending.deleteMany({
    where: {
      userId: session.user.id,
      selectionKeyHash: stateHash,
      accountsEncrypted: "",
      expiresAt: { gt: new Date() },
    },
  });

  if (pending.count !== 1) {
    return redirect("invalid_or_expired_state");
  }

  try {
    const shortLived = await exchangeMetaCode(code);

    const longLived = await getLongLivedMetaToken(
      shortLived.access_token
    );

    const pages = await getMetaPages(longLived.access_token);

    if (pages.length === 0) {
      return redirect("no_pages_found");
    }

    const selectionKey = crypto
      .randomBytes(32)
      .toString("hex");

    const selectionKeyHash = hashValue(selectionKey);

    const accounts = pages.map((page) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      tasks: page.tasks || [],
      instagram: page.instagram_business_account
        ? {
            id: page.instagram_business_account.id,
            username:
              page.instagram_business_account.username,
          }
        : null,
    }));

    // Do not store incomplete account records.
    if (
      accounts.some(
        (account) =>
          !account.id || !account.accessToken
      )
    ) {
      return redirect("missing_page_token");
    }

    
    const accountsEncrypted = encryptToken(
    JSON.stringify({
        version: 2,

        // Long-lived Meta user token.
        // This stays inside the encrypted database field.
        userAccessToken: longLived.access_token,

        // Record its expected expiry when Meta supplies one.
        userTokenExpiresAt:
        typeof longLived.expires_in === "number"
            ? new Date(
                Date.now() + longLived.expires_in * 1000
            ).toISOString()
            : null,

        // Preserve all existing Facebook Page data.
        accounts,
    })
    );

    console.log("Meta callback diagnostics:", {
    formatVersion: 2,
    hasLongLivedUserToken: Boolean(longLived.access_token),
    pageCount: accounts.length,
    });


    await prisma.socialOAuthPending.create({
      data: {
        userId: session.user.id,
        selectionKeyHash,
        accountsEncrypted,
        expiresAt: new Date(
          Date.now() + SELECTION_MAX_AGE
        ),
      },
    });

    // The selection key is a short-lived bearer credential.
    // It is sent only in an HttpOnly cookie, never in the URL.
    const response = redirect("select_account");

    response.cookies.set({
      name: "meta_selection_key",
      value: selectionKey,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/socials/oauth/meta",
      maxAge: SELECTION_MAX_AGE / 1000,
    });

    return response;
  } catch (error) {
    console.error("Meta callback failed:", error.name);

    return redirect("account_discovery_failed");
  }
}
