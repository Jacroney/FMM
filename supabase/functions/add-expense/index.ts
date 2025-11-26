import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflightRequest, corsJsonResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser, sanitizeError } from '../_shared/auth.ts';
import { validateUuid, validatePositiveNumber, validateEnum, validateDateString } from '../_shared/validation.ts';
import { categorizeTransaction } from '../_shared/categorization.ts';

// Enable AI categorization for manual entries (set to false to disable)
const USE_AI_CATEGORIZATION = Deno.env.get('USE_AI_CATEGORIZATION') !== 'false'; // Defaults to true

interface AddExpenseRequest {
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
  auto_categorize?: boolean; // Force auto-categorization even if category_id is provided
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
    const body: AddExpenseRequest = await req.json();

    // Validate required fields
    const amount = validatePositiveNumber(body.amount, 'amount');
    const transactionDate = validateDateString(body.transaction_date, 'transaction_date');

    if (!body.description || body.description.trim().length === 0) {
      return corsJsonResponse({ error: 'Description is required' }, 400, origin);
    }

    // Validate optional enums
    if (body.payment_method) {
      validateEnum(body.payment_method, ['Cash', 'Check', 'Credit Card', 'ACH', 'Venmo', 'Other'], 'payment_method');
    }

    if (body.status) {
      validateEnum(body.status, ['pending', 'completed', 'cancelled'], 'status');
    }

    if (body.transaction_type) {
      validateEnum(body.transaction_type, ['expense', 'income', 'transfer'], 'transaction_type');
    }

    // Get period_id (use current period if not provided)
    let periodId = body.period_id;
    if (periodId) {
      validateUuid(periodId, 'period_id');
    } else {
      // Get current period
      const { data: currentPeriod, error: periodError } = await supabase
        .from('budget_periods')
        .select('id')
        .eq('chapter_id', user.chapter_id)
        .eq('is_current', true)
        .single();

      if (periodError || !currentPeriod) {
        // Fallback to most recent period
        const { data: recentPeriod, error: recentError } = await supabase
          .from('budget_periods')
          .select('id')
          .eq('chapter_id', user.chapter_id)
          .order('start_date', { ascending: false })
          .limit(1)
          .single();

        if (recentError || !recentPeriod) {
          return corsJsonResponse(
            { error: 'No budget period found. Please create a budget period first.' },
            400,
            origin
          );
        }

        periodId = recentPeriod.id;
      } else {
        periodId = currentPeriod.id;
      }
    }

    // Determine category_id
    let categoryId = body.category_id;
    let categorizationMethod = 'manual';

    // Auto-categorize if:
    // 1. No category_id provided, OR
    // 2. auto_categorize flag is explicitly set to true
    if (!categoryId || body.auto_categorize) {
      console.log('[ADD_EXPENSE] Auto-categorizing transaction...');

      const merchantName = body.vendor || body.description;

      try {
        const categorizationResult = await categorizeTransaction(supabase, {
          merchantName,
          chapterId: user.chapter_id,
          source: 'MANUAL',
          useAI: USE_AI_CATEGORIZATION,
        });

        categoryId = categorizationResult.category_id;
        categorizationMethod = categorizationResult.matched_by;

        console.log(`[ADD_EXPENSE] Categorized as: ${categorizationResult.category_name} (${categorizationMethod})`);
      } catch (categorizationError) {
        console.error('[ADD_EXPENSE] Categorization failed:', categorizationError);
        return corsJsonResponse(
          { error: 'Failed to categorize transaction. Please specify a category.' },
          400,
          origin
        );
      }
    } else {
      // Validate provided category_id
      validateUuid(categoryId, 'category_id');

      // Verify category exists and belongs to user's chapter
      const { data: category, error: categoryError } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('id', categoryId)
        .eq('chapter_id', user.chapter_id)
        .eq('is_active', true)
        .single();

      if (categoryError || !category) {
        return corsJsonResponse(
          { error: 'Invalid category or category not found' },
          400,
          origin
        );
      }
    }

    // Determine transaction type from amount if not provided
    const transactionType = body.transaction_type || (amount < 0 ? 'expense' : 'income');

    // Create the expense
    const { data: expense, error: insertError } = await supabase
      .from('expenses')
      .insert({
        chapter_id: user.chapter_id,
        category_id: categoryId,
        period_id: periodId,
        amount: amount,
        description: body.description,
        vendor: body.vendor || null,
        transaction_date: transactionDate,
        payment_method: body.payment_method || null,
        status: body.status || 'completed',
        source: 'MANUAL',
        transaction_type: transactionType,
        notes: body.notes || null,
        receipt_url: body.receipt_url || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ADD_EXPENSE] Database error:', insertError);
      return corsJsonResponse(
        { error: 'Failed to create expense' },
        500,
        origin
      );
    }

    // Return success with expense data
    return corsJsonResponse(
      {
        success: true,
        expense: expense,
        categorization_method: categorizationMethod,
      },
      201,
      origin
    );
  } catch (error) {
    // SECURITY: Sanitize error for client response
    const { error: errorMessage, statusCode } = sanitizeError(error);
    return corsJsonResponse({ error: errorMessage }, statusCode, origin);
  }
});
