
import { getStripe } from "../stripe";
import config from "../config";
import { prisma } from "../prisma";

export const BillingService = {
  async createCheckoutSession(userId, planId) {
    const stripe = getStripe();

    const plan = Object.hasOwn(
      config.stripe.plans,
      planId ?? ""
    )
      ? config.stripe.plans[planId]
      : null;

    if (!plan) {
      throw new Error("Invalid plan selected");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: plan.name,
              description: `Purchase ${plan.credits} AI credits`,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],

      mode: "payment",

      success_url:
        `${config.auth.url}/pricing?success=true`,

      cancel_url:
        `${config.auth.url}/pricing?canceled=true`,

      customer_email: user.email ?? undefined,

      metadata: {
        userId,
        planId,
        credits: String(plan.credits),
        expectedAmount: String(plan.price),
      },
    });

    return session.url;
  },

  async handleWebhook(body, signature) {
    const stripe = getStripe();

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (
      event.type !== "checkout.session.completed" &&
      event.type !== "checkout.session.async_payment_succeeded"
    ) {
      return { received: true, processed: false };
    }

    const session = event.data.object;

    if (
      session.mode !== "payment" ||
      session.payment_status !== "paid"
    ) {
      return { received: true, processed: false };
    }

    const {
      userId,
      planId,
      credits: creditsText,
      expectedAmount,
    } = session.metadata ?? {};

    const credits = Number(creditsText);
    const expected = Number(expectedAmount);

    if (
      !userId ||
      !planId ||
      !Number.isSafeInteger(credits) ||
      credits <= 0 ||
      !Number.isSafeInteger(expected) ||
      expected <= 0 ||
      session.currency !== "eur" ||
      session.amount_total !== expected
    ) {
      throw new Error("Invalid Stripe payment data");
    }

    // Credits and expected amount were stored by our server
    // when the Checkout Session was created.
    const existing = await prisma.creditTransaction.findUnique({
      where: { paymentId: session.id },
    });

    if (existing) {
      if (
        existing.userId !== userId ||
        existing.amount !== credits ||
        existing.type !== "PURCHASE"
      ) {
        throw new Error("Conflicting payment record");
      }

      return { received: true, processed: false };
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: credits,
            type: "PURCHASE",
            description: `Stripe purchase: ${planId}`,
            paymentId: session.id,
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: {
            credits: {
              increment: credits,
            },
          },
        });
      });
    } catch (error) {
      // Concurrent deliveries can race. A unique paymentId
      // ensures only one transaction grants credits.
      if (error.code === "P2002") {
        const purchase =
          await prisma.creditTransaction.findUnique({
            where: { paymentId: session.id },
          });

        if (
          purchase?.userId === userId &&
          purchase?.amount === credits &&
          purchase?.type === "PURCHASE"
        ) {
          return { received: true, processed: false };
        }
      }

      throw error;
    }

    return {
      received: true,
      processed: true,
      userId,
      credits,
    };
  },
};
