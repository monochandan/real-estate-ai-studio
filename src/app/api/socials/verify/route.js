// The endpoint performs a live Meta Graph API request using the encrypted Facebook Page token stored in Prisma.
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/social/encryption";
import { metaGet } from "@/lib/social/meta";

export const runtime = "nodejs";

const REQUIRED_PERMISSIONS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
];

function errorResponse(message, status) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const connections = await prisma.socialConnection.findMany({
      where: {
        userId: session.user.id,
        status: "CONNECTED",
      },
      select: {
        platform: true,
        platformAccountId: true,
        accountName: true,
        accessTokenEncrypted: true,
      },
    });

    const facebook = connections.find(
      (connection) => connection.platform === "FACEBOOK"
    );

    const instagram = connections.find(
      (connection) => connection.platform === "INSTAGRAM"
    );

    if (!facebook?.accessTokenEncrypted) {
      return errorResponse(
        "Connect your Facebook Page first.",
        400
      );
    }

    const pageToken = decryptToken(
      facebook.accessTokenEncrypted
    );

    // Check whether the saved Page token can access its Page.
   const page = await metaGet(
    `/${encodeURIComponent(facebook.platformAccountId)}`,
        pageToken,
        {
            fields: "id,name,instagram_business_account{id,username}",
        }
    );

    // Verify the linked Instagram account.
    const linkedInstagram = page.instagram_business_account || null;

    const instagramMatches =
      Boolean(instagram?.platformAccountId) &&
      linkedInstagram?.id === instagram.platformAccountId;

    // A Page token is not necessarily suitable for querying
    // the original user's /me/permissions endpoint.
    // This verifies Page access and linked account identity,
    // but does not claim to verify all OAuth scopes.
    
    const pageAccounts = await metaGet(
    "/me/accounts",
    pageToken,
    {
        fields: "id,name,tasks",
    }
    );

    const matchingPage = (pageAccounts.data || []).find(
    (item) => item.id === facebook.platformAccountId
    );

    const pageTasks = Array.isArray(matchingPage?.tasks)
    ? matchingPage.tasks
    : [];

    const canCreatePageContent =
    pageTasks.includes("CREATE_CONTENT") ||
    pageTasks.includes("MANAGE");


    return NextResponse.json({
      facebook: {
        connected: true,
        pageId: page.id,
        name: page.name,
        pageTokenValid: true,
        tasks: pageTasks,
        canCreatePageContent,
      },

      instagram: {
        connected: Boolean(instagram),
        accountId: linkedInstagram?.id || null,
        username: linkedInstagram?.username || null,
        matchesSavedAccount: instagramMatches,
      },

      permissions: {
        verified: false,
        required: REQUIRED_PERMISSIONS,
        message:
          "Page access was verified. OAuth permission grants " +
          "must be checked separately using the user access token.",
      },

      publishingReady: false,
    });
  } catch (error) {
  console.error("Meta verification failed:", {
    name: error.name,
    message: error.message,
  });

  return errorResponse(
    "Unable to verify Meta account access.",
    502
  );
}
}
