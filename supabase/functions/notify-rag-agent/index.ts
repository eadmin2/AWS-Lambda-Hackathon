import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

async function waitForDocument(supabase, document_id: string, maxRetries = 15, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Document Fetch] Attempt ${attempt} - Fetching document_id: ${document_id}`);

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .maybeSingle();

    if (error) {
      console.warn(`[Document Fetch] Attempt ${attempt} failed with error:`, error);
    }

    if (data) {
      console.log(`[Document Fetch] Found document with status: ${data.processing_status}`);

      if (data.processing_status === 'completed') {
        console.log(`[Document Fetch] Document is completed on attempt ${attempt}`);
        return data;
      } else {
        console.log(`[Document Fetch] Document exists but status is '${data.processing_status}', waiting for 'completed' status`);
      }
    } else {
      console.warn(`[Document Fetch] No document found on attempt ${attempt}`);
    }

    if (attempt < maxRetries) {
      console.log(`[Document Fetch] Waiting ${delayMs}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`[Document Fetch] Document not completed after ${maxRetries} attempts for document_id: ${document_id}`);
}

serve(async (req) => {
  console.log(`[Request] Incoming request: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    console.log(`[CORS] Handling preflight OPTIONS request`);
    return handleCorsPreflightRequest();
  }

  try {
    const { user_id, document_id } = await req.json();
    console.log(`[Request] Parsed body - user_id: ${user_id}, document_id: ${document_id}`);

    if (!user_id || !document_id) {
      console.warn(`[Validation] Missing user_id or document_id`);
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

    console.log(`[Supabase] Initializing Supabase client`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[Document Lookup] Starting document fetch with retry logic`);
    let document;
    try {
      document = await waitForDocument(supabase, document_id, 15, 1000);
    } catch (docError) {
      console.error(`[Document Lookup] Failed after retries for document_id ${document_id}`, docError);
      return new Response(JSON.stringify({
        error: "Document not found or not completed after retries",
        debug: { document_id, user_id, error: docError.message }
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log(`[Document Lookup] Document is completed. Proceeding with RAG agent call.`);

    const ragAgentUrl = Deno.env.get("RAG_AGENT_URL");
    if (ragAgentUrl) {
      try {
        console.log(`[RAG Agent] Sending POST to ${ragAgentUrl}/rag-agent/${user_id}/reprocess`);
        const ragResponse = await fetch(`${ragAgentUrl}/rag-agent/${user_id}/reprocess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id, user_id })
        });

        if (ragResponse.ok) {
          console.log(`[RAG Agent] Successfully called RAG agent API`);
        } else {
          const ragError = await ragResponse.text();
          console.error(`[RAG Agent] API call failed with status ${ragResponse.status}:`, ragError);
        }
      } catch (ragCallError) {
        console.error(`[RAG Agent] Exception during fetch:`, ragCallError);
      }
    } else {
      console.warn(`[RAG Agent] RAG_AGENT_URL not configured. Skipping RAG call`);
    }

    console.log(`[DB Insert] Inserting condition_updates record for user_id: ${user_id}, document_id: ${document_id}`);
    try {
      const { error: insertError } = await supabase
        .from('condition_updates')
        .insert({
          user_id,
          document_id,
          notification_sent: false,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error(`[DB Insert] Failed to insert condition_updates:`, insertError);
      } else {
        console.log(`[DB Insert] Successfully inserted condition_updates record`);
      }
    } catch (insertCatchError) {
      console.error(`[DB Insert] Exception during insert:`, insertCatchError);
    }

    console.log(`[Response] All steps completed for document_id: ${document_id}. Sending 200 response.`);
    return new Response(JSON.stringify({
      success: true,
      message: "Document processing completed successfully",
      document_status: document.processing_status
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error(`[Error Handler] Unexpected error in notify-rag-agent:`, error);
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
