import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

const PLAID_API_URL = PLAID_ENV === 'production'
  ? 'https://production.plaid.com'
  : PLAID_ENV === 'development'
  ? 'https://development.plaid.com'
  : 'https://sandbox.plaid.com';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { public_token } = await req.json();
    if (!public_token) {
      return new Response(
        JSON.stringify({ error: 'Missing public_token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's chapter from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('chapter_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Exchanging public token for access token...');

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
      console.error('Plaid exchange error:', exchangeData);
      return new Response(
        JSON.stringify({
          error: 'Failed to exchange token',
          details: exchangeData,
        }),
        { status: exchangeResponse.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { access_token, item_id } = exchangeData;

    console.log('Getting institution info...');

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

    console.log('Getting account info...');

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
      console.error('Plaid accounts error:', accountsData);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch accounts',
          details: accountsData,
        }),
        { status: accountsResponse.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('Storing connection in database...');

    // Store connection in database
    const { data: connection, error: connectionError } = await supabase
      .from('plaid_connections')
      .insert({
        chapter_id: profile.chapter_id,
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
      console.error('Database error storing connection:', connectionError);
      return new Response(
        JSON.stringify({
          error: 'Failed to store connection',
          details: connectionError,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('Storing accounts in database...');

    // Store accounts in database
    const accountsToInsert = accountsData.accounts.map((account: any) => ({
      connection_id: connection.id,
      chapter_id: profile.chapter_id,
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
      console.error('Database error storing accounts:', accountsError);
      // Delete the connection if accounts fail to insert
      await supabase
        .from('plaid_connections')
        .delete()
        .eq('id', connection.id);

      return new Response(
        JSON.stringify({
          error: 'Failed to store accounts',
          details: accountsError,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('Connection and accounts stored successfully!');

    // Trigger initial sync (optional - call the sync function)
    try {
      console.log('Triggering initial transaction sync...');
      const syncResponse = await fetch(`${supabaseUrl}/functions/v1/plaid-sync-transactions`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connection_id: connection.id }),
      });

      if (!syncResponse.ok) {
        console.warn('Initial sync failed, but connection was created successfully');
      }
    } catch (syncError) {
      console.warn('Could not trigger initial sync:', syncError);
      // Don't fail the whole request if sync fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        connection_id: connection.id,
        institution_name: institutionName,
        accounts_count: accountsData.accounts.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error exchanging token:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
