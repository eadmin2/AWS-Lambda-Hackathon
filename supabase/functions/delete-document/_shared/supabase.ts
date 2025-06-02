// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

export const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

export const supabase = createClient(
  supabaseUrl,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);
