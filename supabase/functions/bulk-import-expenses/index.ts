import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflightRequest, corsJsonResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser, sanitizeError } from '../_shared/auth.ts';
import { validateUuid } from '../_shared/validation.ts';
import { categorizeBatch } from '../_shared/categorization.ts';

// Enable AI categorization for bulk imports (set to false to disable)
const USE_AI_CATEGORIZATION = Deno.env.get('USE_AI_CATEGORIZATION') !== 'false'; // Defaults to true

interface BulkExpense {
  amount: number;
  description: string;
  vendor?: string;
  transaction_date: string;
  payment_method?: 'Cash' | 'Check' | 'Credit Card' | 'ACH' | 'Venmo' | 'Other';
  category_id?: string; // Optional - will auto-categorize if not provided
  period_id?: string; // Optional - will use current period if not provided
  status?: 'pending' | 'completed' | 'cancelled';
  transaction_type?: 'expense' | 'income' | 'transfer';
  notes?: string;
  receipt_url?: string;
}

interface BulkImportRequest {
  expenses: BulkExpense[];
  auto_categorize?: boolean; // Apply auto-categorization to all expenses
  source?: 'CSV_IMPORT' | 'MANUAL'; // Source of the import
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

    // Parse and validate request body
    const body: BulkImportRequest = await req.json();

    if (!body.expenses || !Array.isArray(body.expenses) || body.expenses.length === 0) {
      return corsJsonResponse({ error: 'expenses array is required and must not be empty' }, 400, origin);
    }

    if (body.expenses.length > 1000) {
      return corsJsonResponse({ error: 'Maximum 1000 expenses per import' }, 400, origin);
    }

    const source = body.source || 'CSV_IMPORT';
    const autoCateg = body.auto_categorize !== false; // Default to true

    // Get current period if needed
    let defaultPeriodId: string | null = null;
    const { data: currentPeriod, error: periodError } = await supabase
      .from('budget_periods')
      .select('id')
      .eq('chapter_id', user.chapter_id)
      .eq('is_current', true)
      .maybeSingle();

    if (currentPeriod) {
      defaultPeriodId = currentPeriod.id;
    } else {
      // Fallback to most recent period
      const { data: recentPeriod } = await supabase
        .from('budget_periods')
        .select('id')
        .eq('chapter_id', user.chapter_id)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentPeriod) {
        defaultPeriodId = recentPeriod.id;
      }
    }

    if (!defaultPeriodId) {
      return corsJsonResponse(
        { error: 'No budget period found. Please create a budget period first.' },
        400,
        origin
      );
    }

    // Prepare transactions for categorization
    const transactionsToCateg = body.expenses
      .filter(exp => !exp.category_id || autoCateg)
      .map(exp => ({
        merchantName: exp.vendor || exp.description,
      }));

    console.log(`[BULK_IMPORT] Categorizing ${transactionsToCateg.length} expenses...`);

    // Batch categorize transactions
    const categorizationResults = await categorizeBatch(
      supabase,
      transactionsToCateg,
      user.chapter_id,
      source,
      USE_AI_CATEGORIZATION
    );

    console.log(`[BULK_IMPORT] Categorization complete. Results: ${categorizationResults.size}`);

    // Build expenses for insertion
    const expensesToInsert = [];
    const errors: string[] = [];
    const categorizationStats = {
      pattern: 0,
      ai: 0,
      uncategorized: 0,
      manual: 0,
    };

    for (let i = 0; i < body.expenses.length; i++) {
      const exp = body.expenses[i];

      try {
        // Validate required fields
        if (!exp.amount || typeof exp.amount !== 'number') {
          errors.push(`Row ${i + 1}: Invalid or missing amount`);
          continue;
        }

        if (!exp.description || exp.description.trim().length === 0) {
          errors.push(`Row ${i + 1}: Description is required`);
          continue;
        }

        if (!exp.transaction_date) {
          errors.push(`Row ${i + 1}: Transaction date is required`);
          continue;
        }

        // Determine category_id
        let categoryId = exp.category_id;
        let categorizationMethod = 'manual';

        if (!categoryId || autoCateg) {
          const merchantName = exp.vendor || exp.description;
          const categResult = categorizationResults.get(merchantName);

          if (categResult) {
            categoryId = categResult.category_id;
            categorizationMethod = categResult.matched_by;
          } else {
            errors.push(`Row ${i + 1}: Failed to categorize transaction`);
            continue;
          }
        } else {
          // Validate provided category_id
          if (!categoryId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            errors.push(`Row ${i + 1}: Invalid category ID format`);
            continue;
          }
        }

        // Track categorization stats
        if (categorizationMethod === 'pattern') categorizationStats.pattern++;
        else if (categorizationMethod === 'ai') categorizationStats.ai++;
        else if (categorizationMethod === 'uncategorized') categorizationStats.uncategorized++;
        else if (categorizationMethod === 'manual') categorizationStats.manual++;

        // Determine transaction type from amount if not provided
        const transactionType = exp.transaction_type || (exp.amount < 0 ? 'expense' : 'income');

        // Build expense object
        expensesToInsert.push({
          chapter_id: user.chapter_id,
          category_id: categoryId,
          period_id: exp.period_id || defaultPeriodId,
          amount: exp.amount,
          description: exp.description,
          vendor: exp.vendor || null,
          transaction_date: exp.transaction_date,
          payment_method: exp.payment_method || null,
          status: exp.status || 'completed',
          source: source,
          transaction_type: transactionType,
          notes: exp.notes || null,
          receipt_url: exp.receipt_url || null,
          created_by: user.id,
        });
      } catch (expError) {
        errors.push(`Row ${i + 1}: ${expError instanceof Error ? expError.message : 'Unknown error'}`);
      }
    }

    if (expensesToInsert.length === 0) {
      return corsJsonResponse(
        {
          success: false,
          errors: errors,
          message: 'No valid expenses to import'
        },
        400,
        origin
      );
    }

    console.log(`[BULK_IMPORT] Inserting ${expensesToInsert.length} expenses...`);

    // Insert expenses in batches of 100 to avoid timeouts
    const batchSize = 100;
    let inserted = 0;
    const insertErrors: string[] = [];

    for (let i = 0; i < expensesToInsert.length; i += batchSize) {
      const batch = expensesToInsert.slice(i, i + batchSize);

      const { data, error: insertError } = await supabase
        .from('expenses')
        .insert(batch)
        .select('id');

      if (insertError) {
        console.error('[BULK_IMPORT] Batch insert error:', insertError);
        insertErrors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      } else {
        inserted += data?.length || 0;
      }
    }

    console.log(`[BULK_IMPORT] Inserted ${inserted} expenses`);

    // Return results
    return corsJsonResponse(
      {
        success: true,
        inserted: inserted,
        failed: body.expenses.length - inserted,
        errors: [...errors, ...insertErrors],
        categorization_stats: categorizationStats,
      },
      201,
      origin
    );
  } catch (error) {
    console.error('[BULK_IMPORT] Error:', error);
    // SECURITY: Sanitize error for client response
    const { error: errorMessage, statusCode } = sanitizeError(error);
    return corsJsonResponse({ error: errorMessage }, statusCode, origin);
  }
});
