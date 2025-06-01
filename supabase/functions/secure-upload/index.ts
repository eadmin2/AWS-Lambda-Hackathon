// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { supabase } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Helper: Read magic bytes from a file (ArrayBuffer)
async function getMagicBytes(file: File, length = 16): Promise<Uint8Array> {
  const buf = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buf);
}

// Helper: Check magic bytes for allowed types
function checkMagicBytes(magic: Uint8Array, fileName: string): string | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  // PDF: 25 50 44 46 ("%PDF")
  if (magic[0] === 0x25 && magic[1] === 0x50 && magic[2] === 0x44 && magic[3] === 0x46) return 'pdf';
  // JPEG: FF D8 FF
  if (magic[0] === 0xFF && magic[1] === 0xD8 && magic[2] === 0xFF) return 'jpg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4E && magic[3] === 0x47) return 'png';
  // TIFF: 49 49 2A 00 or 4D 4D 00 2A
  if ((magic[0] === 0x49 && magic[1] === 0x49 && magic[2] === 0x2A && magic[3] === 0x00) ||
      (magic[0] === 0x4D && magic[1] === 0x4D && magic[2] === 0x00 && magic[3] === 0x2A)) return 'tiff';
  // DOC: D0 CF 11 E0 A1 B1 1A E1
  if (magic[0] === 0xD0 && magic[1] === 0xCF && magic[2] === 0x11 && magic[3] === 0xE0) return 'doc';
  // DOCX: 50 4B 03 04 (ZIP, but check ext)
  if (magic[0] === 0x50 && magic[1] === 0x4B && magic[2] === 0x03 && magic[3] === 0x04 && ext === 'docx') return 'docx';
  // TXT: No magic bytes, but allow if ext is txt and bytes are printable
  if (ext === 'txt') {
    for (let i = 0; i < magic.length; i++) {
      if (magic[i] < 0x09 || (magic[i] > 0x0D && magic[i] < 0x20)) return null;
    }
    return 'txt';
  }
  return null;
}

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
  if (!authHeader) {
    return new Response('Missing authorization header', { status: 401, headers: corsHeaders });
  }
  const jwt = authHeader.replace('Bearer ', '');
  let userId;
  try {
    const { payload } = await supabase.auth.getUser(jwt);
    userId = payload?.sub;
    if (!userId) throw new Error('No user ID in JWT');
  } catch (err) {
    return new Response('Invalid or expired token', { status: 401, headers: corsHeaders });
  }

  // Parse multipart/form-data
  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return new Response('No file uploaded', { status: 400, headers: corsHeaders });
  }
  const fileName = formData.get('fileName') || file.name;
  if (typeof fileName !== 'string') {
    return new Response('Invalid fileName', { status: 400, headers: corsHeaders });
  }

  // Check magic bytes
  const magic = await getMagicBytes(file);
  const detectedType = checkMagicBytes(magic, fileName);
  if (!detectedType) {
    return new Response('File type not allowed or does not match extension', { status: 400, headers: corsHeaders });
  }

  // Upload to Supabase Storage
  const storagePath = `${userId}/${fileName}`;
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(storagePath);

  return new Response(JSON.stringify({ success: true, path: data.path, url: urlData.publicUrl }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}); 