const config = {
  appName: "Real Estate AI Studio",
  auth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    secret: process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
    webhook_url: process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    plans: {
      starter: {
        id: "starter",
        name: "Starter Pack",
        credits: 100,
        price: 1500, // $15.00
      },
      pro: {
        id: "pro",
        name: "Professional Pack",
        credits: 300,
        price: 2500, // $25.00
      },
      business: {
        id: "business",
        name: "Business Pack",
        credits: 750,
        price: 5000, // $50.00
      }
    }
  },
  ai: {
    apiKey: process.env.MUAPIAPP_API_KEY,
    // stagging
    stagingGenerationCost: 6, // 6 credits per AI staging layout generation
    // decluttering
    declutteringGenerationCost: {
      "nano-banana-2-edit": {
        "1k": 12,
        "2k": 18,
        "4k": 24,
      },
      "nano-banana-pro-edit": {
        "1k": 24,
        "2k": 24,
        "4k": 36,
      },
    },
  },
  db: {
    url: process.env.DATABASE_URL,
  }
};

export default config;
