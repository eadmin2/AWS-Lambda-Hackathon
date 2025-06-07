// supabase/functions/delete-document/index.ts
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "DELETE") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create a Supabase client with the JWT token
    // This is the correct way to use the JWT in Edge Functions
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          persistSession: false,
        },
      },
    );

    // Get the user from the JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    console.log("User retrieval result:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: userError?.message,
    });

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token or user not found" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get document ID from request body
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));

    const { document_id, documentId } = body;
    const docId = document_id || documentId;

    if (!docId) {
      return new Response(JSON.stringify({ error: "Missing document ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing delete for document:", docId, "by user:", user.id);

    // First, fetch the document to verify ownership and get file info
    const { data: document, error: fetchError } = await supabaseClient
      .from("documents")
      .select("*")
      .eq("id", docId)
      .single();

    console.log("Document fetch result:", {
      found: !!document,
      error: fetchError?.message,
      documentUserId: document?.user_id,
    });

    if (fetchError || !document) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user owns the document
    if (document.user_id !== user.id) {
      console.log("Ownership check failed:", {
        documentUserId: document.user_id,
        currentUserId: user.id,
      });
      return new Response(
        JSON.stringify({
          error: "Unauthorized: You can only delete your own documents",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Delete the file from storage if it exists
    if (document.file_url) {
      try {
        // Delete from AWS S3 via backend endpoint
        const s3Key = `${user.id}/${document.file_name}`;
        const s3DeleteRes = await fetch(
          Deno.env.get("S3_DELETE_ENDPOINT"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": Deno.env.get("S3_DELETE_API_KEY"),
            },
            body: JSON.stringify({
              bucket: "my-receipts-app-bucket",
              key: s3Key,
            }),
          },
        );
        if (!s3DeleteRes.ok) {
          const err = await s3DeleteRes.json().catch(() => ({}));
          console.error("S3 deletion error:", err.error || s3DeleteRes.statusText);
          return new Response(
            JSON.stringify({ error: err.error || "Failed to delete file from S3" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } catch (storageErr) {
        console.error("Error processing S3 deletion:", storageErr);
        return new Response(
          JSON.stringify({ error: "Error deleting file from S3" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Delete the document record from the database
    const { error: deleteError } = await supabaseClient
      .from("documents")
      .delete()
      .eq("id", docId);

    if (deleteError) {
      console.error("Database deletion error:", deleteError);
      return new Response(
        JSON.stringify({
          error: `Failed to delete document: ${deleteError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Document deleted successfully:", docId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Document deleted successfully",
        documentId: docId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Delete document error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
