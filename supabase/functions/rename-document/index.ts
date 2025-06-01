// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabase, supabaseUrl } from '../delete-document/_shared/supabase.ts';
import { corsHeaders } from '../delete-document/_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Get user from JWT
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  console.log("Auth header:", authHeader);
  if (!authHeader) {
    return new Response('Missing authorization header', { status: 401, headers: corsHeaders });
  }
  const jwt = authHeader.replace('Bearer ', '');
  console.log("JWT:", jwt);
  let userId;
  try {
    const { payload } = await supabase.auth.getUser(jwt);
    console.log("Payload:", payload);
    userId = payload?.sub;
    if (!userId) throw new Error('No user ID in JWT');
  } catch (err) {
    console.error("JWT validation error:", err);
    return new Response('Invalid or expired token', { status: 401, headers: corsHeaders });
  }

  try {
    const { document_id, old_file_name, new_file_name } = await req.json();
    if (!document_id || !old_file_name || !new_file_name) {
      return new Response('Missing document_id, old_file_name, or new_file_name', { status: 400, headers: corsHeaders });
    }

    // 1. Move/rename the file in Supabase Storage
    const { error: moveError } = await supabase.storage
      .from('documents')
      .move(old_file_name, new_file_name);
    if (moveError) throw moveError;

    // 2. Update the file_name and file_url in the documents table
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${new_file_name}`;
    const { error: updateError } = await supabase
      .from('documents')
      .update({ file_name: new_file_name.split('/').pop(), file_url: publicUrl })
      .eq('id', document_id)
      .eq('user_id', userId);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, file_url: publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Rename document error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 