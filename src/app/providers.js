"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import config from "@/lib/config";

// provide the NextAuth session to all child components, 
// components can use useSession()
export function Providers({ children }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const theme = config?.theme || "slate-indigo";
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, []);

  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
