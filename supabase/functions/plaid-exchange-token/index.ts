import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflightRequest, corsJsonResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser, sanitizeError, requireAdminOrExec } from '../_shared/auth.ts';
import { validateString } from '../_shared/validation.ts';

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

    // SECURITY: Only admins and exec can exchange tokens
    requireAdminOrExec(user);

    // SECURITY: Validate input
    const body = await req.json();
    const public_token = validateString(body.public_token, 'public_token', 10, 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    // Exchange public token for access token
    const exchangeResponse = await fetch(`${PLAID_API_URL}/item/public_token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID!,
        'PLAID-SECRET': PLAID_SECRET!,
      },
      body: JSON.stringify({ public_token }),
    });

    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok) {
      // SECURITY: Log error server-side only, don't expose details to client
      console.error('[PLAID_ERROR] Token exchange failed');
      return corsJsonResponse(
        { error: 'Failed to exchange token' },
        exchangeResponse.status,
        origin
      );
    }

    const { access_token, item_id } = exchangeData;

    // Get institution info
    const itemResponse = await fetch(`${PLAID_API_URL}/item/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID!,
        'PLAID-SECRET': PLAID_SECRET!,
      },
      body: JSON.stringify({ access_token }),
    });

    const itemData = await itemResponse.json();
    let institutionName = 'Unknown Institution';
    let institutionId = null;

    if (itemResponse.ok && itemData.item?.institution_id) {
      institutionId = itemData.item.institution_id;

      // Get institution details
      const institutionResponse = await fetch(`${PLAID_API_URL}/institutions/get_by_id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID!,
          'PLAID-SECRET': PLAID_SECRET!,
        },
        body: JSON.stringify({
          institution_id: institutionId,
          country_codes: ['US'],
        }),
      });

      const institutionData = await institutionResponse.json();
      if (institutionResponse.ok && institutionData.institution) {
        institutionName = institutionData.institution.name;
      }
    }

    // Get accounts
    const accountsResponse = await fetch(`${PLAID_API_URL}/accounts/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID!,
        'PLAID-SECRET': PLAID_SECRET!,
      },
      body: JSON.stringify({ access_token }),
    });

    const accountsData = await accountsResponse.json();

    if (!accountsResponse.ok) {
      // SECURITY: Log error server-side only
      console.error('[PLAID_ERROR] Failed to fetch accounts');
      return corsJsonResponse(
        { error: 'Failed to fetch accounts' },
        accountsResponse.status,
        origin
      );
    }

    // Store connection in database
    const { data: connection, error: connectionError } = await supabase
      .from('plaid_connections')
      .insert({
        chapter_id: user.chapter_id,
        institution_name: institutionName,
        institution_id: institutionId,
        access_token: access_token,
        item_id: item_id,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (connectionError) {
      // SECURITY: Log error server-side only
      console.error('[DB_ERROR] Failed to store connection');
      return corsJsonResponse(
        { error: 'Failed to store connection' },
        500,
        origin
      );
    }

    // Store accounts in database
    const accountsToInsert = accountsData.accounts.map((account: any) => ({
      connection_id: connection.id,
      chapter_id: user.chapter_id,
      account_id: account.account_id,
      account_name: account.name,
      official_name: account.official_name,
      account_type: account.type,
      account_subtype: account.subtype,
      mask: account.mask,
      current_balance: account.balances.current,
      available_balance: account.balances.available,
      iso_currency_code: account.balances.iso_currency_code || 'USD',
      last_balance_update: new Date().toISOString(),
      is_active: true,
    }));

    const { error: accountsError } = await supabase
      .from('plaid_accounts')
      .insert(accountsToInsert);

    if (accountsError) {
      // SECURITY: Log error server-side only
      console.error('[DB_ERROR] Failed to store accounts');
      // Delete the connection if accounts fail to insert
      await supabase
        .from('plaid_connections')
        .delete()
        .eq('id', connection.id);

      return corsJsonResponse(
        { error: 'Failed to store accounts' },
        500,
        origin
      );
    }

    // Trigger initial sync (optional - call the sync function)
    // Note: We don't wait for this to complete to avoid timeouts
    try {
      await fetch(`${supabaseUrl}/functions/v1/plaid-sync-transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${req.headers.get('Authorization')?.replace('Bearer ', '')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connection_id: connection.id }),
      });
    } catch (syncError) {
      // SECURITY: Log but don't fail the request if sync fails
      console.error('[SYNC_ERROR] Initial sync failed, connection created successfully');
    }

    // SECURITY: Return only necessary data to client
    return corsJsonResponse(
      {
        success: true,
        connection_id: connection.id,
        institution_name: institutionName,
        accounts_count: accountsData.accounts.length,
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
