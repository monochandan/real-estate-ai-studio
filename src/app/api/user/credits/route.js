import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserCredits } from "@/lib/credits";

// acces the functions from lib/credits.js 
// to update the credits here when user call this api from NAvBAR 53
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const credits = await getUserCredits(session.user.id);

    return NextResponse.json({
      credits,
    });
  } catch (error) {
    console.error("GET /api/user/credits:", error);

    return NextResponse.json(
      { error: "Failed to get credits" },
      { status: 500 }
    );
  }
}