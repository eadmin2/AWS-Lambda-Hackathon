const allowedOrigins = [
  'https://varatingassistant.com',
  'https://earnest-figolla-666ad8.netlify.app',
  'https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--cb7c0bca.local-credentialless.webcontainer-api.io',
];

export function getCorsHeaders(origin?: string) {
  let allowOrigin = allowedOrigins[0];
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
  };
}

// Helper function for CORS preflight requests
export function handleCorsPreflightRequest(origin?: string) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}