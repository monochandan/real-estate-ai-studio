````
Your Prisma schema
       ↓
Defines what your database looks like
       ↓
Prisma migration
       ↓
Creates/updates the tables in Supabase PostgreSQL
       ↓
Prisma Client
       ↓
Your Next.js app reads/writes data
       ↓
Supabase PostgreSQL

For your schema specifically:

User
 ├── Accounts
 ├── Sessions
 ├── StagedRooms
 └── RoomDeclutters

So when a user signs in:

NextAuth
   ↓
User + Account + Session
   ↓
Supabase

When the user stages a room:

Next.js
   ↓
Prisma
   ↓
StagedRoom
   ↓
Supabase

When the user declutters a room:

Next.js
   ↓
Prisma
   ↓
RoomDeclutter
   ↓
Supabase
`````

Supabase = where the actual database lives.
Prisma = the layer your Next.js code uses to communicate with that database.
schema.prisma = the blueprint describing the database.
