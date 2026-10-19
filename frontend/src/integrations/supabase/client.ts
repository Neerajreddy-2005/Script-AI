import { AuthClient } from "@supabase/auth-js";

// Public values from your Supabase project (Project Settings -> API Keys), set in frontend/.env.local.
// The anon/publishable key is safe in the browser; row-level security protects the data.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local (see frontend/.env.example)..");
}

/*
 * The app only uses Supabase Auth (data goes through the FastAPI backend), so we load the auth
 * client alone instead of the full supabase-js SDK (realtime, postgrest, storage), which keeps
 * ~146 KB of unused source out of the main bundle. Options mirror supabase-js's defaults,
 * including the storage key, so existing sessions stay signed in.
 */
const authUrl = new URL("auth/v1", SUPABASE_URL.endsWith("/") ? SUPABASE_URL : `${SUPABASE_URL}/`);

export const supabase = {
  auth: new AuthClient({
    url: authUrl.href.replace(/\/$/, ""),
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
    storageKey: `sb-${authUrl.hostname.split(".")[0]}-auth-token`,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "implicit",
  }),
};
