
import "server-only";
import { createClient } from "@supabase/supabase-js";

let adminClient;

export function getSupabaseAdmin() {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Supabase server credentials are missing");
    }

    adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
