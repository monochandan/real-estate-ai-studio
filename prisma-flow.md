                    ┌────────────────────┐
                    │      Next.js       │
                    │       App          │
                    └─────────┬──────────┘
                              │
                    Prisma Client
                              │
                     DATABASE_URL
                              │
                              ▼
                  ┌───────────────────────┐
                  │  Supabase Pooler      │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │   Supabase Postgres   │
                  │                       │
                  │ User                  │
                  │ Account               │
                  │ Session               │
                  │ Project               │
                  │ Asset                 │
                  │ GenerationJob         │
                  │ CreditTransaction     │
                  └───────────────────────┘
                              │
                              │
                     Supabase Storage
                              │
                    ┌─────────▼─────────┐
                    │ Images / Videos   │
                    └───────────────────┘

                    MIGRATION

schema.prisma
      │
      ▼
prisma migrate dev
      │
      │ DIRECT_URL
      ▼
Supabase PostgreSQL




# 1. Install dependencies
npm install prisma @prisma/client
npm install @prisma/adapter-pg pg dotenv

# 2. Validate
npx prisma format
npx prisma validate

# 3. Create database tables
npx prisma migrate dev --name init

# 4. Generate Prisma client
npx prisma generate

# 5. Inspect database
npx prisma studio
