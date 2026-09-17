"use client";
// no need this file, we are using another providers.js
import { SessionProvider } from "next-auth/react";

export function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
