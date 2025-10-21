import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflightRequest, corsJsonResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser, sanitizeError, requireAdminOrExec } from '../_shared/auth.ts';

// SECURITY: Separate credentials for sandbox and production
const PLAID_CLIENT_ID_SANDBOX = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET_SANDBOX = Deno.env.get('PLAID_SECRET');
const PLAID_CLIENT_ID_PRODUCTION = Deno.env.get('PLAID_CLIENT_ID_PRODUCTION');
const PLAID_SECRET_PRODUCTION = Deno.env.get('PLAID_SECRET_PRODUCTION');

// Helper to get credentials based on environment
function getPlaidCredentials(environment: string): { clientId: string; secret: string; apiUrl: string } {
  if (environment === 'production') {
    if (!PLAID_CLIENT_ID_PRODUCTION || !PLAID_SECRET_PRODUCTION) {
      throw new Error('Production Plaid credentials not configured');
    }
    return {
      clientId: PLAID_CLIENT_ID_PRODUCTION,
      secret: PLAID_SECRET_PRODUCTION,
      apiUrl: 'https://production.plaid.com',
    };
  } else {
    // Default to sandbox for safety
    if (!PLAID_CLIENT_ID_SANDBOX || !PLAID_SECRET_SANDBOX) {
      throw new Error('Sandbox Plaid credentials not configured');
    }
    return {
      clientId: PLAID_CLIENT_ID_SANDBOX,
      secret: PLAID_SECRET_SANDBOX,
      apiUrl: 'https://sandbox.plaid.com',
    };
  }
}

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

    // Parse request body to get environment preference
    const body = await req.json();
    const environment = body.environment === 'sandbox' ? 'sandbox' : 'production'; // Default to production for safety

    // Get credentials for the specified environment
    const { clientId, secret, apiUrl } = getPlaidCredentials(environment);

    console.log(`[PLAID] Creating link token for environment: ${environment}`);

    // Create Plaid link token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const response = await fetch(`${apiUrl}/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
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
        environment, // Include environment so client knows which mode
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
