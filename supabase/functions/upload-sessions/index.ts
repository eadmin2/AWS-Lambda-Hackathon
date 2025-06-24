import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req: Request) => {
  const url = new URL(req.url);
  const method = req.method;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const sessionId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

  // Authenticate user (Supabase JWT)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // POST /upload-sessions - Create session
  if (method === 'POST' && pathParts[pathParts.length - 1] === 'upload-sessions') {
    const { files } = await req.json();
    if (!Array.isArray(files)) {
      return new Response('Invalid files metadata', { status: 400 });
    }
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('upload_sessions')
      .insert({
        user_id: user.id,
        files,
        progress: 0,
        expires_at: expiresAt,
        audit_log: JSON.stringify([
          { timestamp: new Date().toISOString(), action: 'created', userId: user.id }
        ])
      })
      .select('id, expires_at')
      .single();
    if (error) {
      return new Response('Failed to create session', { status: 500 });
    }
    return new Response(JSON.stringify({ sessionId: data.id, expiresAt: data.expires_at }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // GET /upload-sessions/:id - Get session state
  if (method === 'GET' && sessionId) {
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (error || !data) {
      return new Response('Session not found', { status: 404 });
    }
    // Only return minimal metadata
    return new Response(JSON.stringify({
      id: data.id,
      files: data.files,
      progress: data.progress,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      expiresAt: data.expires_at,
      auditLog: data.audit_log
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // PUT /upload-sessions/:id - Update session state
  if (method === 'PUT' && sessionId) {
    const { files, progress, auditLog } = await req.json();
    const updateFields: any = { updated_at: new Date().toISOString() };
    if (files) updateFields.files = files;
    if (typeof progress === 'number') updateFields.progress = progress;
    if (auditLog) updateFields.audit_log = auditLog;
    const { error } = await supabase
      .from('upload_sessions')
      .update(updateFields)
      .eq('id', sessionId);
    if (error) {
      return new Response('Failed to update session', { status: 500 });
    }
    return new Response('Session updated', { status: 200 });
  }

  // DELETE /upload-sessions/:id - Clean up session
  if (method === 'DELETE' && sessionId) {
    const { error } = await supabase
      .from('upload_sessions')
      .delete()
      .eq('id', sessionId);
    if (error) {
      return new Response('Failed to delete session', { status: 500 });
    }
    return new Response('Session deleted', { status: 200 });
  }

  return new Response('Not Found', { status: 404 });
}); 