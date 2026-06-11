import { createClient } from "@supabase/supabase-js";

// Client-side supabase instance specifically for realtime
// It uses anon key initially, but we will pass the custom JWT when subscribing
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
