export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://varatingassistant.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
};

// Helper function for CORS preflight requests
export function handleCorsPreflightRequest() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}