// creates payment checkout session for an authenticated user

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
// uses it to verify an existing session: needs the same secret to decrypt the 
// JWT and the same session.strategy: "jwt" to know how to interpret it.



import { BillingService } from "@/lib/services/billing";



export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      // if there is no session or session.user, return a 401 Unauthorized response
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // line 29, pricing/page.js
    const { planId } = await req.json();
    if (!planId) {
      // if planId is missing from the request body, return a 400 Bad Request response
      return NextResponse.json({ error: "Missing planId parameter" }, { status: 400 });
    }

    // calls the billing layer (wrapping with stripe API) to create 
    // a hosted checkout page for the given user
    // and plan. returns the url the user should be redirect to.
    const checkoutUrl = await BillingService.createCheckoutSession(session.user.id, planId);

    // success:200 with { url: checkoutUrl }, so the frontend can redirect the user to the payment page.
    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    // Any exception is cought and logged.
    console.error("Checkout route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
