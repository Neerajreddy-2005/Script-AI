import { createClient } from "@supabase/supabase-js";

// Public values from your Supabase project (Project Settings -> API Keys), set in frontend/.env.local.
// The anon/publishable key is safe in the browser; row-level security protects the data.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local (see frontend/.env.example)..");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
