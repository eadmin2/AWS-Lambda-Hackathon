import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function appendAuditLog(auditLog: unknown[], action: string, userId: string, details: Record<string, unknown> = {}) {
  return [
    ...(Array.isArray(auditLog) ? auditLog : []),
    { timestamp: new Date().toISOString(), action, userId, ...details }
  ];
}

async function expireOldSessions(userId: string) {
  // Expire sessions that are past their expires_at
  const now = new Date().toISOString();
  const { data: sessions, error: _error } = await supabase
    .from('upload_sessions')
    .select('id, audit_log, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .lt('expires_at', now);
  if (sessions && sessions.length > 0) {
    for (const session of sessions) {
      const newAudit = appendAuditLog(session.audit_log, 'expired', userId);
      await supabase
        .from('upload_sessions')
        .update({ status: 'expired', ended_at: now, audit_log: newAudit })
        .eq('id', session.id);
    }
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  const url = new URL(req.url);
  const method = req.method;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const sessionId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

  // Authenticate user (Supabase JWT)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  // Expire old sessions for this user
  await expireOldSessions(user.id);

  // POST /upload-sessions - Create session
  if (method === 'POST' && pathParts[pathParts.length - 1] === 'upload-sessions') {
    const { files } = await req.json();
    if (!Array.isArray(files)) {
      return new Response('Invalid files metadata', { status: 400, headers: corsHeaders });
    }
    // Check for active session conflict
    const { data: activeSession } = await supabase
      .from('upload_sessions')
      .select('id, status, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (activeSession) {
      return new Response(JSON.stringify({
        error: 'conflict',
        message: 'An upload session is already active.',
        sessionId: activeSession.id,
        expiresAt: activeSession.expires_at
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const auditLog = appendAuditLog([], 'created', user.id);
    const { data, error: _error } = await supabase
      .from('upload_sessions')
      .insert({
        user_id: user.id,
        files,
        progress: {},
        status: 'active',
        expires_at: expiresAt,
        audit_log: auditLog
      })
      .select('id, expires_at')
      .single();
    if (_error) {
      return new Response('Failed to create session', { status: 500, headers: corsHeaders });
    }
    // Update profiles.active_upload_session_id
    await supabase
      .from('profiles')
      .update({ active_upload_session_id: data.id })
      .eq('id', user.id);
    return new Response(JSON.stringify({ sessionId: data.id, expiresAt: data.expires_at }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // GET /upload-sessions/:id - Get session state
  if (method === 'GET' && sessionId) {
    const { data, error: _error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (_error || !data) {
      return new Response('Session not found', { status: 404, headers: corsHeaders });
    }
    // Only allow session owner
    if (data.user_id !== user.id) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    // Expire if needed
    if (data.status === 'active' && new Date(data.expires_at) < new Date()) {
      const newAudit = appendAuditLog(data.audit_log, 'expired', user.id);
      await supabase
        .from('upload_sessions')
        .update({ status: 'expired', ended_at: new Date().toISOString(), audit_log: newAudit })
        .eq('id', sessionId);
      return new Response(JSON.stringify({ error: 'expired', message: 'Session expired.' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      id: data.id,
      files: data.files,
      progress: data.progress,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      expiresAt: data.expires_at,
      endedAt: data.ended_at,
      auditLog: data.audit_log
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // PUT /upload-sessions/:id - Update session state
  if (method === 'PUT' && sessionId) {
    const { files, progress, status, auditEvent } = await req.json();
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('user_id, audit_log, status')
      .eq('id', sessionId)
      .single();
    if (sessionError || !session) {
      return new Response('Session not found', { status: 404, headers: corsHeaders });
    }
    if (session.user_id !== user.id) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (files) updateFields.files = files;
    if (progress) updateFields.progress = progress;
    if (status) updateFields.status = status;
    if (status && ['completed', 'expired', 'conflict'].includes(status)) {
      updateFields.ended_at = new Date().toISOString();
    }
    // Append audit event
    let auditLog = session.audit_log;
    if (auditEvent) {
      auditLog = appendAuditLog(auditLog as unknown[], auditEvent, user.id);
      updateFields.audit_log = auditLog;
    }
    const { error: _error } = await supabase
      .from('upload_sessions')
      .update(updateFields)
      .eq('id', sessionId);
    if (_error) {
      return new Response('Failed to update session', { status: 500, headers: corsHeaders });
    }
    // If session is completed/expired/conflict, clear active_upload_session_id
    if (status && ['completed', 'expired', 'conflict'].includes(status)) {
      await supabase
        .from('profiles')
        .update({ active_upload_session_id: null })
        .eq('id', user.id);
    }
    return new Response('Session updated', { status: 200, headers: corsHeaders });
  }

  // DELETE /upload-sessions/:id - Clean up session
  if (method === 'DELETE' && sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('user_id, audit_log, status')
      .eq('id', sessionId)
      .single();
    if (sessionError || !session) {
      return new Response('Session not found', { status: 404, headers: corsHeaders });
    }
    if (session.user_id !== user.id) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    const now = new Date().toISOString();
    const newAudit = appendAuditLog(session.audit_log as unknown[], 'deleted', user.id);
    await supabase
      .from('upload_sessions')
      .update({ status: 'expired', ended_at: now, audit_log: newAudit })
      .eq('id', sessionId);
    await supabase
      .from('profiles')
      .update({ active_upload_session_id: null })
      .eq('id', user.id);
    return new Response('Session deleted', { status: 200, headers: corsHeaders });
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
}); 