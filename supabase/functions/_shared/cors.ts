/**
 * CORS Utilities for Supabase Edge Functions
 *
 * SECURITY: Implements strict CORS policy with domain whitelist
 * instead of wildcard '*' which allows any origin
 */

// SECURITY: Define allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:5173',           // Local development
  'http://localhost:4173',           // Vite preview
  'https://greekpay.org',            // Production
  'https://www.greekpay.org',        // Production with www
  'https://greekpay.vercel.app',     // Vercel deployment (if applicable)
];

// Development mode check
const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development' ||
                      Deno.env.get('DENO_DEPLOYMENT_ID') === undefined;

/**
 * Get CORS headers for a given origin
 * @param origin - The origin from the request
 * @returns CORS headers object
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  // In development, allow localhost
  const allowedOrigin = isDevelopment && origin?.includes('localhost')
    ? origin
    : ALLOWED_ORIGINS.includes(origin || '')
    ? origin
    : ALLOWED_ORIGINS[0]; // Fallback to first allowed origin

  return {
    'Access-Control-Allow-Origin': allowedOrigin || '',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight requests
 * @param req - The incoming request
 * @returns Response for OPTIONS request or null
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response('ok', {
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}

/**
 * Create a JSON response with proper CORS headers
 * @param data - Response data
 * @param status - HTTP status code
 * @param origin - Origin from request headers
 * @returns Response object with CORS headers
 */
export function corsJsonResponse(
  data: any,
  status: number,
  origin: string | null
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
    },
  });
}

/**
 * Verify origin is allowed
 * @param origin - The origin from the request
 * @returns boolean indicating if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // In development, allow localhost
  if (isDevelopment && origin.includes('localhost')) {
    return true;
  }

  return ALLOWED_ORIGINS.includes(origin);
}
