# 🏡 Real Estate AI Studio
<!--EstateStager AI — Open-Source AI Virtual Home Staging SaaS (Free BoxBrownie & Virtual Staging AI Alternative)-->
[![Next.js](https://img.shields.io/badge/Next.js-14%20(App%20Router)-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![NextAuth](https://img.shields.io/badge/NextAuth-Google%20OAuth-1F2937?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://next-auth.js.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-Styling-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MuAPI](https://img.shields.io/badge/MuAPI-AI%20Engine-8B5CF6?style=for-the-badge&logo=ai&logoColor=white)](https://muapi.ai/)
[![Webhook](https://img.shields.io/badge/Webhook-Async%20Delivery-F59E0B?style=for-the-badge&logo=webhook&logoColor=white)](https://www.postman.com/webhooks)   

> **Turn a room into furnished showrooms with photorealistic AI staging in seconds.** A production-ready, self-hostable Next.js SaaS boilerplate built for real estate agents, home stagers, and interior designers — replaces $20–$30/photo virtual staging services. A free open-source alternative to BoxBrownie, Virtual Staging AI, ApplyDesign, and roOomy — powered by the MuAPI AI engine.

> **Turn a massy room into clean room in seconds.** A production-ready, self-hostable Next.js SaaS boilerplate built for real estate agents, home stagers, and interior designers — replaces $20–$30/photo virtual staging services. A free open-source alternative to BoxBrownie, Virtual Staging AI, ApplyDesign, and roOomy — powered by the MuAPI AI engine.
> 
> **Turn static image into realistic video.** A production-ready, self-hostable Next.js SaaS boilerplate built for real estate agents, home stagers, and interior designers — replaces $20–$30/photo virtual staging services. A free open-source alternative to BoxBrownie, Virtual Staging AI, ApplyDesign, and roOomy — powered by the MuAPI AI engine.

<!--**Tech stack:** Next.js 14 (App Router) · Prisma · PostgreSQL · NextAuth (Google OAuth) · Stripe · Tailwind CSS · MuAPI · Webhook-backed async delivery-->
**Use cases:** MLS listing photography · Empty property staging · Pre-sale home preparation · Airbnb listing visuals · Interior design mood boards · Realtor marketing · Investor property showcases · Real estate flyers

<!-- <p align="center">
  <a href="https://github.com/Anil-matcha/awesome-generative-ai-apps">
    <img src="https://img.shields.io/badge/Part%20of-Awesome%20Generative%20AI%20Apps-FFD700?style=for-the-badge&logo=github&logoColor=black" alt="Awesome Generative AI Apps">
  </a>
</p> -->

<!-- 🎨 **[Explore 50+ more open-source AI apps →](https://github.com/Anil-matcha/awesome-generative-ai-apps)**-->

<!--https://github.com/user-attachments/assets/5dea1dae-62f2-43fd-9824-3c6e25b15209-->

<!--## 🌐 Project Details

<!--**GitHub Repository:** [github.com/SamurAIGPT/ai-real-estate-stager](https://github.com/SamurAIGPT/ai-real-estate-stager)--> 

<!--**Live Demo Preview:** [ai-real-estate-stager.vercel.app](https://ai-real-estate-stager.vercel.app/)-->

---

Real State AI Studio is a production-ready, highly-optimized AI web application. Out of the box, it seamlessly manages User Authentication, Credits & Billing, Image Persistence, and asynchronous AI staging using a sleek Next.js (App Router) architecture. It empowers real estate agents, home stagers, and interior designers to turn empty vacant spaces into premium furnished showrooms — all without physical staging costs.-->

**Why use Real Estate AI Studio?**

- **Production-Ready SaaS** — Complete with Google OAuth and Stripe Checkout workflows built-in.
- **AI Staging Studio** — Upload vacant room photos, pick a room type and design style, auto-generate or customize the AI prompt, and stage instantly.
- **Draggable Before/After Slider** — A fluid drag-clip slider lets users compare the original empty space vs. the AI-furnished staging side-by-side in real time.
- **Webhook-Backed AI Delivery** — MuAPI async webhook delivers results directly into the database (`/api/webhook/muapi`), keeping API routes non-blocking.
- **Personal Gallery Dashboard** — All staged rooms are saved to PostgreSQL. Users can review, compare, download, and delete their stagings from `/dashboard`.
- **Extensible Architecture** — Easily swap the underlying AI model or add new room types and design styles without breaking the UI.

<!--![EstateStager AI Screenshot](https://cdn.muapi.ai/data/2/635974623291/Screenshot_2026-05-25_160552.png)-->

---

## ✨ Core Features

### 🎨 AI Design Studio (Main Page `/`)
- Upload a vacant room photo via file picker or drag-and-drop. Instant local preview shown before upload completes.
- Select **Room Type**: Living Room, Bedroom, Kitchen, Office, Dining Room, Bathroom.
- Select **Staging Style**: Modern Minimal, Scandinavian, Boho Chic, Industrial Loft, Mid-Century, Rustic Cabin.
- Auto-generated AI prompt updates dynamically based on room and style selection. Fully editable — users can fine-tune the prompt, with a **Reset** button to restore the smart default.
- Cost: **6 credits** per AI staging generation.

### ↔️ Before/After Comparison Slider
- Draggable clip-path vertical split bar over the 16:9 viewer shows the empty room on the left and the AI-staged result on the right.
- Works with mouse drag and touch events — smooth, responsive, and mobile-friendly.
- Label badges (`Before (Empty)` / `After (Staged)`) anchored in the corners.

### 🖼️ Personal Staging Gallery (`/dashboard`)
- Visual card grid of all staged rooms for the signed-in user.
- Cards show a thumbnail, room type, design style, date, and staging status (`generating` / `completed` / `failed`).
- Full-screen split-slider review modal with **Download High-Res** and **Delete Staging** actions.
- Auto-polls every 4 seconds for any rooms still in `generating` state.

### 💳 Stripe Credit Billing (`/pricing`)
- Three credit packs: **Starter** ($10 / 100 credits), **Professional** ($25 / 300 credits), **Business** ($50 / 750 credits).
- No recurring subscriptions — pay once, use at your own pace.
- Credit balance is automatically topped up via Stripe webhook on checkout completion.

### 🔐 Google Auth + Credit Persistence
- NextAuth Google provider with Prisma adapter — user sessions, credit balances, and staging galleries are all persisted per account.
- Credits displayed live in the Navbar with a pulsing coin icon.

---



## 🏗️ Technical Architecture

```
Directory structure:
└── monochandan-real-estate-ai-studio/
    ├── README.md
    ├── eslint.config.mjs
    ├── jsconfig.json
    ├── next.config.mjs
    ├── package.json
    ├── postcss.config.mjs
    ├── prisma.config.ts
    ├── real-estate-ai.txt
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.js
        │   ├── page.js
        │   ├── providers.js
        │   ├── api/
        │   │   ├── auth/
        │   │   │   └── [...nextauth]/
        │   │   │       └── route.js
        │   │   ├── checkout/
        │   │   │   └── route.js
        │   │   ├── declutter/
        │   │   │   └── generation/
        │   │   │       └── route.js
        │   │   ├── download/
        │   │   │   └── route.js
        │   │   ├── rooms/
        │   │   │   └── route.js
        │   │   ├── stage/
        │   │   │   └── route.js
        │   │   ├── stripe/
        │   │   │   ├── checkout/
        │   │   │   │   └── route.js
        │   │   │   └── webhook/
        │   │   │       └── route.js
        │   │   ├── upload/
        │   │   │   └── route.js
        │   │   ├── user/
        │   │   │   └── apikey/
        │   │   │       └── route.js
        │   │   └── webhook/
        │   │       ├── muapi/
        │   │       │   └── route.js
        │   │       └── stripe/
        │   │           └── route.js
        │   ├── declutter/
        │   │   └── page.js
        │   ├── gallery/
        │   │   └── page.js
        │   ├── login/
        │   │   └── page.js
        │   └── pricing/
        │       └── page.js
        ├── components/
        │   ├── Footer.js
        │   ├── Navbar.js
        │   ├── Providers.jsx
        │   └── layout/
        │       └── Navbar.jsx
        └── lib/
            ├── auth.js
            ├── config.js
            ├── prisma.js
            ├── stripe.js
            └── services/
                ├── billing.js
                └── user.js
```

---

<!--## 📄 License

MIT Licensed.

---

_EstateStager AI: A modular, mobile-ready, production-grade AI virtual staging SaaS built for real estate professionals and creators._ -->

