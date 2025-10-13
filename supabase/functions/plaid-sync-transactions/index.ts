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

// Helper function to auto-categorize transactions using category rules
async function autoCategorizeTransaction(
  supabase: any,
  merchantName: string,
  chapterId: string
): Promise<string | null> {
  try {
    // Get all PLAID category rules ordered by priority
    const { data: rules, error } = await supabase
      .from('category_rules')
      .select('category, merchant_pattern, priority')
      .eq('source', 'PLAID')
      .order('priority', { ascending: false });

    if (error || !rules || rules.length === 0) {
      return null;
    }

    // Try to match merchant name against patterns
    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.merchant_pattern);
        if (regex.test(merchantName)) {
          // Found a match! Now get the category_id
          const { data: category, error: catError } = await supabase
            .from('budget_categories')
            .select('id')
            .eq('chapter_id', chapterId)
            .eq('name', rule.category)
            .eq('is_active', true)
            .single();

          if (!catError && category) {
            return category.id;
          }
        }
      } catch (regexError) {
        console.warn('Invalid regex pattern:', rule.merchant_pattern);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error in auto-categorization:', error);
    return null;
  }
}

// Helper function to get or create "Uncategorized" category
async function getUncategorizedCategoryId(supabase: any, chapterId: string): Promise<string | null> {
  try {
    const { data: category, error } = await supabase
      .from('budget_categories')
      .select('id')
      .eq('chapter_id', chapterId)
      .eq('name', 'Uncategorized')
      .eq('is_active', true)
      .single();

    if (error || !category) {
      // Try to find any active category as fallback
      const { data: fallback, error: fallbackError } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('chapter_id', chapterId)
        .eq('is_active', true)
        .limit(1)
        .single();

      return fallback?.id || null;
    }

    return category.id;
  } catch (error) {
    console.error('Error getting uncategorized category:', error);
    return null;
  }
}

// Helper function to get current period for a chapter
async function getCurrentPeriodId(supabase: any, chapterId: string): Promise<string | null> {
  try {
    const { data: period, error } = await supabase
      .from('budget_periods')
      .select('id')
      .eq('chapter_id', chapterId)
      .eq('is_current', true)
      .single();

    if (error || !period) {
      // Fallback to most recent period
      const { data: fallback, error: fallbackError } = await supabase
        .from('budget_periods')
        .select('id')
        .eq('chapter_id', chapterId)
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      return fallback?.id || null;
    }

    return period.id;
  } catch (error) {
    console.error('Error getting current period:', error);
    return null;
  }
}

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
    const { connection_id } = await req.json();
    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: 'Missing connection_id' }),
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

    // Get user's chapter
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

    // Get connection
    const { data: connection, error: connectionError } = await supabase
      .from('plaid_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('chapter_id', profile.chapter_id)
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Connection not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create sync history record
    const { data: syncRecord, error: syncRecordError } = await supabase
      .from('plaid_sync_history')
      .insert({
        connection_id: connection.id,
        chapter_id: profile.chapter_id,
        cursor_before: connection.cursor,
        sync_status: 'running',
      })
      .select()
      .single();

    if (syncRecordError) {
      console.error('Failed to create sync record:', syncRecordError);
    }

    console.log('Starting transaction sync for connection:', connection.id);

    let cursor = connection.cursor;
    let hasMore = true;
    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;
    let accountsUpdated = 0;

    // Get current period and uncategorized category for this chapter
    const periodId = await getCurrentPeriodId(supabase, profile.chapter_id);
    const uncategorizedCategoryId = await getUncategorizedCategoryId(supabase, profile.chapter_id);

    if (!periodId || !uncategorizedCategoryId) {
      throw new Error('Chapter must have at least one budget period and category configured');
    }

    // Fetch account ID mappings for this connection
    const { data: accounts, error: accountsError } = await supabase
      .from('plaid_accounts')
      .select('id, account_id')
      .eq('connection_id', connection.id);

    if (accountsError) {
      throw new Error('Failed to fetch accounts: ' + accountsError.message);
    }

    const accountIdMap = new Map(accounts.map((a: any) => [a.account_id, a.id]));

    // Sync transactions using cursor-based pagination
    while (hasMore) {
      const syncBody: any = {
        access_token: connection.access_token,
        count: 100, // Fetch 100 transactions per request
      };

      if (cursor) {
        syncBody.cursor = cursor;
      }

      const syncResponse = await fetch(`${PLAID_API_URL}/transactions/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID!,
          'PLAID-SECRET': PLAID_SECRET!,
        },
        body: JSON.stringify(syncBody),
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        console.error('Plaid sync error:', syncData);

        // Update sync record with error
        if (syncRecord) {
          await supabase
            .from('plaid_sync_history')
            .update({
              sync_status: 'failed',
              error_message: JSON.stringify(syncData),
              completed_at: new Date().toISOString(),
            })
            .eq('id', syncRecord.id);
        }

        return new Response(
          JSON.stringify({
            error: 'Failed to sync transactions',
            details: syncData,
          }),
          { status: syncResponse.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      // Process added transactions
      for (const transaction of syncData.added || []) {
        try {
          const merchantName = transaction.merchant_name || transaction.name || 'Unknown';
          let categoryId = await autoCategorizeTransaction(supabase, merchantName, profile.chapter_id);

          if (!categoryId) {
            categoryId = uncategorizedCategoryId;
          }

          const accountDbId = accountIdMap.get(transaction.account_id);

          const { error: insertError } = await supabase
            .from('expenses')
            .insert({
              chapter_id: profile.chapter_id,
              category_id: categoryId,
              period_id: periodId,
              amount: Math.abs(transaction.amount), // Plaid returns negative for debits
              description: transaction.name,
              vendor: transaction.merchant_name,
              transaction_date: transaction.date,
              payment_method: 'ACH',
              status: 'completed',
              source: 'PLAID',
              plaid_transaction_id: transaction.transaction_id,
              account_id: accountDbId || null,
              created_by: user.id,
            });

          if (insertError) {
            console.error('Error inserting transaction:', insertError);
          } else {
            totalAdded++;
          }
        } catch (txError) {
          console.error('Error processing added transaction:', txError);
        }
      }

      // Process modified transactions
      for (const transaction of syncData.modified || []) {
        try {
          const { error: updateError } = await supabase
            .from('expenses')
            .update({
              amount: Math.abs(transaction.amount),
              description: transaction.name,
              vendor: transaction.merchant_name,
              transaction_date: transaction.date,
            })
            .eq('plaid_transaction_id', transaction.transaction_id);

          if (!updateError) {
            totalModified++;
          }
        } catch (txError) {
          console.error('Error processing modified transaction:', txError);
        }
      }

      // Process removed transactions
      for (const transaction of syncData.removed || []) {
        try {
          const { error: deleteError } = await supabase
            .from('expenses')
            .update({
              status: 'cancelled',
              notes: 'Transaction removed by bank',
            })
            .eq('plaid_transaction_id', transaction.transaction_id);

          if (!deleteError) {
            totalRemoved++;
          }
        } catch (txError) {
          console.error('Error processing removed transaction:', txError);
        }
      }

      // Update cursor
      cursor = syncData.next_cursor;
      hasMore = syncData.has_more;

      console.log(`Batch complete. Added: ${syncData.added?.length || 0}, Modified: ${syncData.modified?.length || 0}, Removed: ${syncData.removed?.length || 0}`);
    }

    // Update account balances
    const balanceResponse = await fetch(`${PLAID_API_URL}/accounts/balance/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID!,
        'PLAID-SECRET': PLAID_SECRET!,
      },
      body: JSON.stringify({ access_token: connection.access_token }),
    });

    const balanceData = await balanceResponse.json();

    if (balanceResponse.ok && balanceData.accounts) {
      for (const account of balanceData.accounts) {
        const accountDbId = accountIdMap.get(account.account_id);
        if (accountDbId) {
          const { error: balanceError } = await supabase
            .from('plaid_accounts')
            .update({
              current_balance: account.balances.current,
              available_balance: account.balances.available,
              last_balance_update: new Date().toISOString(),
            })
            .eq('id', accountDbId);

          if (!balanceError) {
            accountsUpdated++;
          }
        }
      }
    }

    // Update connection with new cursor and last sync time
    await supabase
      .from('plaid_connections')
      .update({
        cursor: cursor,
        last_synced_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      })
      .eq('id', connection.id);

    // Update sync history record
    if (syncRecord) {
      await supabase
        .from('plaid_sync_history')
        .update({
          transactions_added: totalAdded,
          transactions_modified: totalModified,
          transactions_removed: totalRemoved,
          accounts_updated: accountsUpdated,
          cursor_after: cursor,
          sync_status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncRecord.id);
    }

    console.log('Sync complete!');

    return new Response(
      JSON.stringify({
        success: true,
        transactions_added: totalAdded,
        transactions_modified: totalModified,
        transactions_removed: totalRemoved,
        accounts_updated: accountsUpdated,
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
    console.error('Error syncing transactions:', error);
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
