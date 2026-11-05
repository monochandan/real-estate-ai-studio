
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  encryptToken,
  decryptToken,
} from "@/lib/social/encryption";
import { metaGet } from "@/lib/social/meta";
export const runtime = "nodejs";

const SELECTION_COOKIE = "meta_selection_key";

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function jsonError(message, status) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

function clearSelectionCookie(response) {
  response.cookies.set({
    name: SELECTION_COOKIE,
    value: "",
    path: "/api/socials/oauth/meta",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
}

async function getPendingSelection(request, userId) {
  const selectionKey =
    request.cookies.get(SELECTION_COOKIE)?.value;

  if (!selectionKey) {
    return null;
  }

  return prisma.socialOAuthPending.findFirst({
    where: {
      userId,
      selectionKeyHash: hashValue(selectionKey),
      expiresAt: {
        gt: new Date(),
      },
      accountsEncrypted: {
        not: "",
      },
    },
  });
}


function parsePendingAccounts(encryptedValue) {
  const data = JSON.parse(decryptToken(encryptedValue));

  // Older OAuth sessions stored the accounts array directly.
  if (Array.isArray(data)) {
    return {
      accounts: data,
      userAccessToken: null,
      userTokenExpiresAt: null,
    };
  }

  // New OAuth sessions store the user token alongside
  // the accounts inside one encrypted object.
  if (
    data?.version === 2 &&
    Array.isArray(data.accounts) &&
    typeof data.userAccessToken === "string"
  ) {
    return {
      accounts: data.accounts,
      userAccessToken: data.userAccessToken,
      userTokenExpiresAt: data.userTokenExpiresAt || null,
    };
  }

  throw new Error("INVALID_PENDING_ACCOUNTS");
}


// GET: Return available Pages without access tokens.
export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const pending = await getPendingSelection(
      request,
      session.user.id
    );

    if (!pending) {
      return jsonError(
        "Selection expired. Please reconnect Facebook.",
        404
      );
    }

   const { accounts } = parsePendingAccounts(
    pending.accountsEncrypted
    );

    return NextResponse.json({
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        instagram: account.instagram,
      })),
      expiresAt: pending.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error(
      "Meta account selection GET failed:",
      error.name
    );

    return jsonError(
      "Unable to retrieve Facebook Pages.",
      500
    );
  }
}

// POST: Save the selected Facebook Page.
export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  // Reject cross-origin requests before changing data.
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  if (!origin || origin !== expectedOrigin) {
    return jsonError("Invalid request origin.", 403);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const pageId = body?.pageId;

  if (typeof pageId !== "string" || !pageId) {
    return jsonError("A Facebook Page is required.", 400);
  }

  try {
    const pending = await getPendingSelection(
      request,
      session.user.id
    );

    if (!pending) {
      return jsonError(
        "Selection expired. Please reconnect Facebook.",
        404
      );
    }

    const {
    accounts,
    userAccessToken,
    } = parsePendingAccounts(pending.accountsEncrypted);

    const selectedPage = accounts.find(
      (account) => account.id === pageId
    );

    if (!selectedPage?.accessToken) {
      return jsonError("Invalid Facebook Page.", 400);
    }

    
    let permissionCheck = {
    verified: false,
    granted: [],
    missing: [],
    pageTasks: selectedPage.tasks || [],
    };

    console.log("Meta OAuth diagnostics:", {
    hasUserAccessToken: Boolean(userAccessToken),
    pageTaskCount: selectedPage.tasks?.length ?? 0,
    });

    if (userAccessToken) {
        const permissionResponse = await metaGet(
            "/me/permissions",
            userAccessToken
        );

        const granted = (permissionResponse.data || [])
        .filter((permission) => permission.status === "granted")
        .map((permission) => permission.permission);

        const requiredPermissions = [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
        ];

        permissionCheck = {
            verified: true,
            granted,
            missing: requiredPermissions.filter(
            (permission) => !granted.includes(permission)
            ),
            pageTasks: selectedPage.tasks || [],
        };
    }   


    const encryptedPageToken = encryptToken(
      selectedPage.accessToken
    );

    const facebookPageUrl = `https://www.facebook.com/profile.php?id=${encodeURIComponent(selectedPage.id)}`;


    const instagram = selectedPage.instagram;

    const instagramProfileUrl = instagram?.username
    ? `https://www.instagram.com/${encodeURIComponent(instagram.username)}/`
    : null;

    // The conditional deletion consumes the selection once.
    // Both operations happen in one database transaction.
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.socialOAuthPending.deleteMany({
        where: {
          id: pending.id,
          userId: session.user.id,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (consumed.count !== 1) {
        throw new Error("SELECTION_ALREADY_CONSUMED");
      }

   
    await tx.socialConnection.upsert({
    where: {
        userId_platform: {
        userId: session.user.id,
        platform: "FACEBOOK",
        },
    },

    create: {
        userId: session.user.id,
        platform: "FACEBOOK",
        platformAccountId: selectedPage.id,
        accountName: selectedPage.name,
        profileUrl: facebookPageUrl,
        status: "CONNECTED",
        accessTokenEncrypted: encryptedPageToken,
    },

    update: {
        platformAccountId: selectedPage.id,
        accountName: selectedPage.name,
        profileUrl: facebookPageUrl,
        status: "CONNECTED",
        accessTokenEncrypted: encryptedPageToken,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        grantedScopes: permissionCheck.verified
                        ? permissionCheck.granted
                        : [],
    },
    });

    
    if (instagram?.id) {
        await tx.socialConnection.upsert({
            where: {
            userId_platform: {
                userId: session.user.id,
                platform: "INSTAGRAM",
            },
            },

        create: {
        userId: session.user.id,
        platform: "INSTAGRAM",
        platformAccountId: instagram.id,
        accountName: instagram.username
            ? `@${instagram.username}`
            : "Instagram Professional Account",
        username: instagram.username || null,
        profileUrl: instagramProfileUrl,
        status: "CONNECTED",
        accessTokenEncrypted: encryptedPageToken,
        },

        update: {
        platformAccountId: instagram.id,
        accountName: instagram.username
            ? `@${instagram.username}`
            : "Instagram Professional Account",
        username: instagram.username || null,
        profileUrl: instagramProfileUrl,
        status: "CONNECTED",
        accessTokenEncrypted: encryptedPageToken,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        grantedScopes: permissionCheck.verified
                        ? permissionCheck.granted
                        : [],
        },
    
        });
    }
    // This ensures your database doesn't incorrectly claim that an unlinked Instagram account remains connected
    else {
        await tx.socialConnection.updateMany({
            where: {
            userId: session.user.id,
            platform: "INSTAGRAM",
            },
            data: {
            status: "NOT_CONNECTED",
            accessTokenEncrypted: null,
            refreshTokenEncrypted: null,
            tokenExpiresAt: null,
            },
        });
    }


    });

    
    const response = NextResponse.json({
    success: true,
    platform: "FACEBOOK",
    account: {
        id: selectedPage.id,
        name: selectedPage.name,
    },
    instagram: instagram?.id
        ? {
            id: instagram.id,
            username: instagram.username || null,
        }
        : null,
    permissions: {
        verified: permissionCheck.verified,
        missing: permissionCheck.missing,
        pageTasks: permissionCheck.pageTasks,
    },
    });


    return clearSelectionCookie(response);
  } catch (error) {
    if (error.message === "SELECTION_ALREADY_CONSUMED") {
      return jsonError(
        "Selection already used or expired.",
        409
      );
    }

    console.error(
      "Meta account selection POST failed:",
      error.name
    );

    return jsonError(
      "Unable to save Facebook connection.",
      500
    );
  }
}
