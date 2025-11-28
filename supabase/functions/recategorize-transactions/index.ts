import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflightRequest, corsJsonResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser, sanitizeError, requireAdminOrExec } from '../_shared/auth.ts';
import { categorizeTransaction } from '../_shared/categorization.ts';

// Enable AI categorization for recategorization (set to false to disable)
const USE_AI_CATEGORIZATION = Deno.env.get('USE_AI_CATEGORIZATION') !== 'false'; // Defaults to true

interface RecategorizeRequest {
  category_name?: string; // Optional: only recategorize transactions in this category (e.g., "Uncategorized")
  period_id?: string; // Optional: only recategorize transactions in this period
  limit?: number; // Optional: limit number of transactions to recategorize
  dry_run?: boolean; // If true, return what would be changed without making changes
  recategorize_all?: boolean; // If true, recategorize ALL transactions (not just a specific category)
}

serve(async (req) => {
  const origin = req.headers.get('origin');

  // SECURITY: Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    // SECURITY: Authenticate user
    const supabase = createSupabaseClient();
    const user = await authenticateUser(req, supabase);

    // SECURITY: Only admins and exec can recategorize transactions
    requireAdminOrExec(user);

    // Parse request body
    const body: RecategorizeRequest = await req.json();
    const recategorizeAll = body.recategorize_all === true;
    const categoryName = body.category_name || 'Uncategorized';
    const limit = body.limit && body.limit > 0 ? Math.min(body.limit, 1000) : 1000; // Max 1000
    const dryRun = body.dry_run === true;

    console.log(`[RECATEGORIZE] Starting${dryRun ? ' (DRY RUN)' : ''} - ${recategorizeAll ? 'ALL transactions' : `Category: ${categoryName}`}, Limit: ${limit}`);

    // Build query for transactions
    let query = supabase
      .from('expenses')
      .select(`
        id,
        description,
        vendor,
        source,
        category_id,
        plaid_primary_category,
        plaid_detailed_category,
        budget_categories (
          name
        )
      `)
      .eq('chapter_id', user.chapter_id)
      .limit(limit)
      .order('created_at', { ascending: false });

    // If not recategorizing all, filter to specific category
    if (!recategorizeAll) {
      const { data: targetCategory, error: categoryError } = await supabase
        .from('budget_categories')
        .select('id, name')
        .eq('chapter_id', user.chapter_id)
        .eq('name', categoryName)
        .eq('is_active', true)
        .maybeSingle();

      if (categoryError || !targetCategory) {
        return corsJsonResponse(
          { error: `Category "${categoryName}" not found` },
          404,
          origin
        );
      }

      query = query.eq('category_id', targetCategory.id);
    }

    if (body.period_id) {
      query = query.eq('period_id', body.period_id);
    }

    const { data: transactions, error: queryError } = await query;

    if (queryError) {
      console.error('[RECATEGORIZE] Query error:', queryError);
      return corsJsonResponse(
        { error: 'Failed to fetch transactions' },
        500,
        origin
      );
    }

    if (!transactions || transactions.length === 0) {
      return corsJsonResponse(
        {
          success: true,
          message: 'No transactions found matching criteria',
          recategorized: 0,
          unchanged: 0,
          errors: [],
        },
        200,
        origin
      );
    }

    console.log(`[RECATEGORIZE] Found ${transactions.length} transactions to process`);

    // Track statistics
    const stats = {
      recategorized: 0,
      unchanged: 0,
      plaid_category: 0,
      pattern: 0,
      ai: 0,
      uncategorized: 0,
    };
    const errors: string[] = [];
    const changes: Array<{
      transaction_id: string;
      merchant_name: string;
      old_category: string;
      new_category: string;
      matched_by: string;
    }> = [];

    // Process each transaction individually to use Plaid category data
    for (const tx of transactions) {
      try {
        const merchantName = tx.vendor || tx.description || 'Unknown';
        const oldCategoryName = (tx.budget_categories as any)?.name || 'Unknown';
        const oldCategoryId = tx.category_id;

        // Build Plaid category object if available
        const plaidCategory = tx.plaid_primary_category ? {
          primary: tx.plaid_primary_category,
          detailed: tx.plaid_detailed_category || tx.plaid_primary_category,
          confidence_level: 'HIGH' as const, // Assume HIGH for stored data
        } : undefined;

        // Categorize transaction using the full categorization logic (including Plaid mapping)
        const categResult = await categorizeTransaction(supabase, {
          merchantName,
          chapterId: user.chapter_id,
          source: tx.source === 'PLAID' ? 'PLAID' : 'MANUAL',
          useAI: USE_AI_CATEGORIZATION,
          plaidCategory,
        });

        // Check if category changed
        if (categResult.category_id === oldCategoryId) {
          stats.unchanged++;
          if (categResult.matched_by === 'uncategorized') stats.uncategorized++;
        } else {
          // Category changed!
          stats.recategorized++;

          if (categResult.matched_by === 'plaid_category') stats.plaid_category++;
          else if (categResult.matched_by === 'pattern') stats.pattern++;
          else if (categResult.matched_by === 'ai') stats.ai++;
          else stats.uncategorized++;

          changes.push({
            transaction_id: tx.id,
            merchant_name: merchantName,
            old_category: oldCategoryName,
            new_category: categResult.category_name,
            matched_by: categResult.matched_by,
          });

          // Update transaction if not dry run
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('expenses')
              .update({ category_id: categResult.category_id })
              .eq('id', tx.id);

            if (updateError) {
              console.error('[RECATEGORIZE] Update error:', updateError);
              errors.push(`Transaction ${tx.id}: Failed to update - ${updateError.message}`);
              stats.recategorized--;
            }
          }
        }
      } catch (txError) {
        console.error(`[RECATEGORIZE] Error processing transaction ${tx.id}:`, txError);
        errors.push(`Transaction ${tx.id}: ${txError instanceof Error ? txError.message : 'Unknown error'}`);
      }
    }

    console.log(`[RECATEGORIZE] Complete - Recategorized: ${stats.recategorized}, Unchanged: ${stats.unchanged}`);

    // Return results
    return corsJsonResponse(
      {
        success: true,
        dry_run: dryRun,
        recategorize_all: recategorizeAll,
        processed: transactions.length,
        recategorized: stats.recategorized,
        unchanged: stats.unchanged,
        stats: {
          plaid_category_matched: stats.plaid_category,
          pattern_matched: stats.pattern,
          ai_matched: stats.ai,
          still_uncategorized: stats.uncategorized,
        },
        changes: dryRun ? changes : changes.slice(0, 50), // Return all changes in dry run, first 50 otherwise
        errors: errors,
      },
      200,
      origin
    );
  } catch (error) {
    console.error('[RECATEGORIZE] Error:', error);
    // SECURITY: Sanitize error for client response
    const { error: errorMessage, statusCode } = sanitizeError(error);
    return corsJsonResponse({ error: errorMessage }, statusCode, origin);
  }
});
