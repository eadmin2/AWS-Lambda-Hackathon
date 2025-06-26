import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest();
  }

  try {
    const { user_id, document_id } = await req.json();

    if (!user_id || !document_id) {
      return new Response(JSON.stringify({
        error: "Missing user_id or document_id"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the document details to verify it exists and get extracted text
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", user_id)
      .single();

    if (docError || !document) {
      return new Response(JSON.stringify({
        error: "Document not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Call the rag-agent API to process the document
    const ragAgentUrl = Deno.env.get("RAG_AGENT_URL");
    const response = await fetch(`${ragAgentUrl}/rag-agent/${user_id}/reprocess`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        document_id,
        user_id
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to notify rag-agent: ${error}`);
    }

    // *** NEW: After RAG agent processes successfully, trigger notification ***
    try {
      console.log(`RAG agent completed processing for user ${user_id}, triggering notification...`);
      
      // Create a condition_updates record to trigger notification
      const { error: insertError } = await supabase
        .from('condition_updates')
        .insert({
          user_id: user_id,
          document_id: document_id,
          notification_sent: false,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to create condition_updates record:', insertError);
      }

      // Also call the notification function directly
      const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/notify-condition-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          user_id: user_id,
          trigger: 'rag_agent_completed'
        })
      });

      if (notificationResponse.ok) {
        console.log(`Notification triggered successfully for user ${user_id}`);
      } else {
        console.error(`Failed to trigger notification for user ${user_id}:`, await notificationResponse.text());
      }

    } catch (notificationError) {
      console.error('Error triggering notification:', notificationError);
      // Don't fail the main request if notification fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: "RAG agent notified successfully"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error in notify-rag-agent:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});