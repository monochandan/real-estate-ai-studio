import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google"; // for goole auth
import CredentialsProvider from "next-auth/providers/credentials"; // for MuAPI auth
import { prisma } from "./prisma";

// https://next-auth.js.org/providers/google
// https://next-auth.js.org/configuration/providers/credentials


// single auth config that powers two very different login flows
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },

  
  providers: [
    // standard OAuth "Sign in with Google."
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // a custom "login" that accepts an API key instead of a password.
    CredentialsProvider({
      id: "credentials",
      name: "API Key",
      credentials: {
        apiKey: { label: "MuAPI Key", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.apiKey) {
          throw new Error("API Key is required");
        }
        const apiKey = credentials.apiKey.trim();
        if (apiKey.length < 5) {
          throw new Error("Invalid API key format");
        }
        // Takes the key, derives a deterministic dummy email
        const dummyEmail = `apikey_${apiKey.slice(-8)}@muapi.local`;

        // Looks up a user by customApiKey or that email.
        let dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { customApiKey: apiKey },
              { email: dummyEmail }
            ]
          }
        });

        // If none exists, auto-creates one (with 0 credits).
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: "API Key User",
              email: dummyEmail,
              customApiKey: apiKey,
              credits: 0,
            }
          });
          // If the user exists but has no customApiKey set yet, back-fills it.
        } else if (!dbUser.customApiKey) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { customApiKey: apiKey }
          });
        }
        // Returns a user object flagged with isApiKeyUser: true
        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image || null,
          credits: dbUser.credits,
          customApiKey: dbUser.customApiKey || apiKey,
          isApiKeyUser: true,
        };
      }
    }),
  ],
  // first sign in -> (user present): copies id, credits, customApiKey, isApiKeyUser into the token.
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.credits = user.credits;
        token.customApiKey = user.customApiKey;
        token.isApiKeyUser = user.isApiKeyUser || false;
      }

      // trigger === "update" -> allows client-side update() calls to push new credits or customApiKey into the token.
      if (trigger === "update" && session) {

        // Every token refresh: re-fetches credits and customApiKey from the database 
        // so the token never goes stale (e.g., if a checkout decrements credits, 
        // the next request picks up the new value).
        if (session.customApiKey !== undefined) token.customApiKey = session.customApiKey;
        if (session.credits !== undefined) token.credits = session.credits;
      }

      // Maps token fields onto session.user so both the client (useSession()) 
      // and the server (getServerSession()) can read user.id, user.credits, 
      // user.customApiKey, user.isApiKeyUser.
      const userId = token.id || token.sub;
      if (userId) {
        token.id = userId;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true, customApiKey: true }
          });
          if (dbUser) {
            token.credits = dbUser.credits;
            token.customApiKey = dbUser.customApiKey;
          }
        } catch (err) {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id || token.sub;
        session.user.credits = token.credits;
        session.user.customApiKey = token.customApiKey;
        session.user.isApiKeyUser = Boolean(token.customApiKey);
      }
      return session;
    },
  },
  // secret — signs/verifies the JWT.
  // pages.signIn: "/login" — redirects unauthenticated users 
  // to your custom login page instead of NextAuth's default.
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};
