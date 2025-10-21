import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflightRequest, corsJsonResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser, sanitizeError, requireAdminOrExec } from '../_shared/auth.ts';
import { validateUuid } from '../_shared/validation.ts';

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
        // SECURITY: Log pattern errors server-side only
        console.error('[CATEGORIZATION] Invalid regex pattern');
        continue;
      }
    }

    return null;
  } catch (error) {
    // SECURITY: Log categorization errors server-side only
    console.error('[CATEGORIZATION] Auto-categorization failed');
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
    // SECURITY: Log errors server-side only
    console.error('[DB_ERROR] Failed to get uncategorized category');
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
    // SECURITY: Log errors server-side only
    console.error('[DB_ERROR] Failed to get current period');
    return null;
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

    // SECURITY: Only admins and exec can sync transactions
    requireAdminOrExec(user);

    // SECURITY: Validate input
    const body = await req.json();
    const connection_id = validateUuid(body.connection_id, 'connection_id');

    // SECURITY: Verify user has access to this connection
    const { data: connection, error: connectionError } = await supabase
      .from('plaid_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('chapter_id', user.chapter_id)
      .single();

    if (connectionError || !connection) {
      return corsJsonResponse(
        { error: 'Connection not found or access denied' },
        404,
        origin
      );
    }

    // Get credentials for the connection's environment
    const environment = connection.environment || 'sandbox'; // Default to sandbox if not set
    const { clientId, secret, apiUrl } = getPlaidCredentials(environment);

    console.log(`[PLAID] Syncing transactions for environment: ${environment}`);

    // Create sync history record
    const { data: syncRecord, error: syncRecordError } = await supabase
      .from('plaid_sync_history')
      .insert({
        connection_id: connection.id,
        chapter_id: user.chapter_id,
        cursor_before: connection.cursor,
        sync_status: 'running',
      })
      .select()
      .single();

    if (syncRecordError) {
      // SECURITY: Log error server-side only
      console.error('[DB_ERROR] Failed to create sync record');
    }

    let cursor = connection.cursor;
    let hasMore = true;
    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;
    let accountsUpdated = 0;

    // Get current period and uncategorized category for this chapter
    const periodId = await getCurrentPeriodId(supabase, user.chapter_id);
    const uncategorizedCategoryId = await getUncategorizedCategoryId(supabase, user.chapter_id);

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

      const syncResponse = await fetch(`${apiUrl}/transactions/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
        },
        body: JSON.stringify(syncBody),
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        // SECURITY: Log error server-side only
        console.error('[PLAID_ERROR] Transaction sync failed');

        // Update sync record with error
        if (syncRecord) {
          await supabase
            .from('plaid_sync_history')
            .update({
              sync_status: 'failed',
              error_message: 'Plaid API error',
              completed_at: new Date().toISOString(),
            })
            .eq('id', syncRecord.id);
        }

        return corsJsonResponse(
          { error: 'Failed to sync transactions' },
          syncResponse.status,
          origin
        );
      }

      // Process added transactions
      for (const transaction of syncData.added || []) {
        try {
          const merchantName = transaction.merchant_name || transaction.name || 'Unknown';
          let categoryId = await autoCategorizeTransaction(supabase, merchantName, user.chapter_id);

          if (!categoryId) {
            categoryId = uncategorizedCategoryId;
          }

          const accountDbId = accountIdMap.get(transaction.account_id);

          const { error: insertError } = await supabase
            .from('expenses')
            .insert({
              chapter_id: user.chapter_id,
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
            // SECURITY: Log error server-side only
            console.error('[DB_ERROR] Failed to insert transaction');
          } else {
            totalAdded++;
          }
        } catch (txError) {
          // SECURITY: Log error server-side only
          console.error('[TRANSACTION_ERROR] Failed to process added transaction');
        }
      }

      // Process modified transactions
      for (const transaction of syncData.modified || []) {
        try {
          // Try to update existing transaction
          const { data: updated, error: updateError } = await supabase
            .from('expenses')
            .update({
              amount: Math.abs(transaction.amount),
              description: transaction.name,
              vendor: transaction.merchant_name,
              transaction_date: transaction.date,
            })
            .eq('plaid_transaction_id', transaction.transaction_id)
            .select();

          if (updateError) {
            console.error('[DB_ERROR] Failed to update transaction');
            continue;
          }

          // If no rows were updated, transaction doesn't exist - insert it instead
          if (!updated || updated.length === 0) {
            console.log('[PLAID] Modified transaction not found, inserting:', transaction.transaction_id);

            const merchantName = transaction.merchant_name || transaction.name || 'Unknown';
            let categoryId = await autoCategorizeTransaction(supabase, merchantName, user.chapter_id);

            if (!categoryId) {
              categoryId = uncategorizedCategoryId;
            }

            const accountDbId = accountIdMap.get(transaction.account_id);

            const { error: insertError } = await supabase
              .from('expenses')
              .insert({
                chapter_id: user.chapter_id,
                category_id: categoryId,
                period_id: periodId,
                amount: Math.abs(transaction.amount),
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
              console.error('[DB_ERROR] Failed to insert modified transaction');
            } else {
              totalAdded++; // Count as added since we inserted it
            }
          } else {
            totalModified++;
          }
        } catch (txError) {
          // SECURITY: Log error server-side only
          console.error('[TRANSACTION_ERROR] Failed to process modified transaction');
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
          // SECURITY: Log error server-side only
          console.error('[TRANSACTION_ERROR] Failed to process removed transaction');
        }
      }

      // Update cursor
      cursor = syncData.next_cursor;
      hasMore = syncData.has_more;
    }

    // Update account balances
    const balanceResponse = await fetch(`${apiUrl}/accounts/balance/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
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

    // SECURITY: Return only necessary data to client
    return corsJsonResponse(
      {
        success: true,
        transactions_added: totalAdded,
        transactions_modified: totalModified,
        transactions_removed: totalRemoved,
        accounts_updated: accountsUpdated,
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
