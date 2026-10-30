
import { NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing";

export const runtime = "nodejs";

export async function POST(req) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is missing");

    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();

  try {
    const result = await BillingService.handleWebhook(
      body,
      signature
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Stripe webhook error:", error);

    const invalidSignature =
      error.type === "StripeSignatureVerificationError";

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: invalidSignature ? 400 : 500 }
    );
  }
}
