### Flow
                         USER
                          │
                          │ Visits /login
                          ▼
              ┌───────────────────────┐
              │     Login Page        │
              │       /login          │
              └───────────┬───────────┘
                          │
                          │ Clicks
                          │ "Continue with Google"
                          ▼
              ┌───────────────────────┐
              │   signIn("google")    │
              │   NextAuth Client      │
              └───────────┬───────────┘
                          │
                          │ Redirect
                          ▼
              ┌───────────────────────┐
              │    Google OAuth       │
              │                       │
              │ User chooses Google   │
              │ account + approves    │
              └───────────┬───────────┘
                          │
                          │ Google returns
                          │ authorization
                          ▼
              ┌───────────────────────┐
              │       NextAuth        │
              │                       │
              │   GoogleProvider      │
              └───────────┬───────────┘
                          │
                          │ User authenticated
                          ▼
              ┌───────────────────────┐
              │    PrismaAdapter      │
              │                       │
              │ Find/Create User      │
              │ in database           │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │     PostgreSQL / DB   │
              │                       │
              │ User                  │
              │ ├─ id                 │
              │ ├─ name               │
              │ ├─ email              │
              │ ├─ image              │
              │ └─ credits             │
              └───────────┬───────────┘
                          │
                          │ User returned
                          ▼
              ┌───────────────────────┐
              │      JWT Callback     │
              │                       │
              │ token.id = user.id    │
              │ token.credits         │
              └───────────┬───────────┘
                          │
                          │ JWT session
                          ▼
              ┌───────────────────────┐
              │    NextAuth Session   │
              │                       │
              │ session.user.id       │
              │ session.user.credits  │
              │ session.user.email    │
              │ session.user.name     │
              └───────────┬───────────┘
                          │
                          │ Session available
                          ▼
              ┌───────────────────────┐
              │      /login Page      │
              │                       │
              │ useSession()          │
              │ status = authenticated│
              └───────────┬───────────┘
                          │
                          │ router.push(next)
                          ▼
              ┌───────────────────────┐
              │       Your App        │
              │        "/"            │
              │                       │
              │ User is logged in     │
              └───────────────────────┘
### user credits
User logs in
     │
     ▼
JWT created
     │
     ▼
token.id = user.id
     │
     ▼
Find user in Prisma
     │
     ▼
Read credits
     │
     ▼
token.credits = database credits
     │
     ▼
session.user.credits
