import NextAuth from "next-auth"; // imports the nextauth factor function (authentication olution for Next.js)

// imports configuration objects (providers, callbacks, session strategy, etc.) from the auth.js file
import { authOptions } from "@/lib/auth";
//uses it to create sessions: knows which providers to handle, 
// which callbacks to run, what secret to sign the JWT with.


// calls the factory, which returns a single async function that handles 
// all next auth api functions  (signin, signout, session,callback, CSRF etc.) 
// based on the request method (GET, POST, etc.)
const handler = NextAuth(authOptions);

// export that same function under both names, 
// so that it can be used for both GET and POST requests to the /api/auth/[...nextauth] route
export { handler as GET, handler as POST };



// The [...nextauth] in the file path is a catch-all segment, 
// so any request to /api/auth/* (e.g. /api/auth/signin, 
// /api/auth/callback/google, /api/auth/session) lands 
// in this single handler, which internally dispatches to the correct action.
