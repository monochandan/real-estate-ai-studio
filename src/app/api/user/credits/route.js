import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserCredits, consumeCredits } from "@/lib/credits";
const costs = {
  "room-staging": 12,
  "room-decluttering": 8,
  "virtual-tour": 20,
};

// get teh user credits
export async function GET() {    
  try {
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    // lib/credits.js
    const credits = await getUserCredits(session.user.id);

    return NextResponse.json({ credits });

  } catch (error) {
    console.error("GET /api/user/credits:", error);

    return NextResponse.json(
      { error: "Failed to get credits" },
      { status: 500 }
    );
  }
}

// update   
export async function POST(request) {
  try {
    const { service } = await request.json(); // service form the request body
    amount = costs[service]
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const credits = await consumeCredits(session.user.id, amount);

    return NextResponse.json({
      success: true,
      credits,
    });

  } catch (error) {
    console.error("POST /api/user/credits:", error);

    if (error.message === "Insufficient credits") {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to consume credits" },
      { status: 500 }
    );
  }
}