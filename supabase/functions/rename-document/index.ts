// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase, supabaseUrl } from "../delete-document/_shared/supabase.ts";
import { corsHeaders } from "../delete-document/_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Get user from JWT
  const authHeader =
    req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader) {
    return new Response("Missing authorization header", {
      status: 401,
      headers: corsHeaders,
    });
  }
  // Create a Supabase client as the current user (JWT in global.headers)
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: { persistSession: false },
  });
  let userId;
  try {
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    userId = user?.id;
    if (userError || !userId) throw new Error("No user ID in JWT");
  } catch (err) {
    return new Response("Invalid or expired token", {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    const { document_id, old_file_name, new_file_name } = await req.json();
    if (!document_id || !old_file_name || !new_file_name) {
      return new Response(
        "Missing document_id, old_file_name, or new_file_name",
        { status: 400, headers: corsHeaders },
      );
    }

    // File renaming in Supabase Storage is deprecated. Use AWS S3 APIs for renaming files.
    // const { error: moveError } = await supabase.storage
    //   .from("documents")
    //   .move(old_file_name, new_file_name);
    // if (moveError) throw moveError;

    // 2. Update the file_name and file_url in the documents table
    const publicUrl = `https://my-receipts-app-bucket.s3.us-east-2.amazonaws.com/${new_file_name}`;
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        file_name: new_file_name.split("/").pop(),
        file_url: publicUrl,
      })
      .eq("id", document_id)
      .eq("user_id", userId);
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, file_url: publicUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Rename document error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
