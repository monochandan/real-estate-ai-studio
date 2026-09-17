Not logged in
→ Navbar shows Sign In
→ Click Sign In
→ Redirect to /login

On login page
→ User signs in with Google
→ Your auth/database logic checks whether the user already exists
→ New user: create user with 10 credits
→ Existing user: keep their current credit balance
→ Login succeeds

After login
→ Redirect to /
→ Navbar now shows 🪙 current credit balance instead of Sign In
→ Clicking the credit balance → /pricing

So yes: the 10-credit gift logic belongs in your authentication/user-creation flow, not the navbar. The navbar only fetches and displays the current balance.
