import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflightRequest, corsJsonResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser, sanitizeError, requireAdminOrExec } from '../_shared/auth.ts';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

const PLAID_API_URL = PLAID_ENV === 'production'
  ? 'https://production.plaid.com'
  : PLAID_ENV === 'development'
  ? 'https://development.plaid.com'
  : 'https://sandbox.plaid.com';

serve(async (req) => {
  const origin = req.headers.get('origin');

  // SECURITY: Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    // SECURITY: Authenticate user and get profile with role
    const supabase = createSupabaseClient();
    const user = await authenticateUser(req, supabase);

    // SECURITY: Only admins and exec can create Plaid connections
    requireAdminOrExec(user);

    // Create Plaid link token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const response = await fetch(`${PLAID_API_URL}/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID!,
        'PLAID-SECRET': PLAID_SECRET!,
      },
      body: JSON.stringify({
        client_name: 'Greek Pay',
        user: {
          client_user_id: user.chapter_id,
        },
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: `${supabaseUrl}/functions/v1/plaid-webhook`,
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings'],
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // SECURITY: Log error details server-side only
      console.error('[PLAID_ERROR] Failed to create link token');
      return corsJsonResponse(
        { error: 'Failed to create link token' },
        response.status,
        origin
      );
    }

    // SECURITY: Return only necessary data to client
    return corsJsonResponse(
      {
        link_token: data.link_token,
        expiration: data.expiration,
      },
      200,
      origin
    );
  } catch (error) {
    // SECURITY: Sanitize error for client response
    const { error: errorMessage, statusCode } = sanitizeError(error);
    return corsJsonResponse({ error: errorMessage }, statusCode, origin);
  }
});
