import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCorsPreflightRequest, corsJsonResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser, sanitizeError } from '../_shared/auth.ts';
import { categorizeTransaction } from '../_shared/categorization.ts';

// Enable AI categorization for suggestions (set to false to disable)
const USE_AI_CATEGORIZATION = Deno.env.get('USE_AI_CATEGORIZATION') !== 'false'; // Defaults to true

interface SuggestCategoryRequest {
  merchant_name: string;
  source?: 'PLAID' | 'MANUAL' | 'CSV_IMPORT';
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
    const body: SuggestCategoryRequest = await req.json();

    if (!body.merchant_name || body.merchant_name.trim().length === 0) {
      return corsJsonResponse({ error: 'merchant_name is required' }, 400, origin);
    }

    const source = body.source || 'MANUAL';

    // Categorize the transaction
    console.log(`[SUGGEST_CATEGORY] Suggesting category for: "${body.merchant_name}"`);

    const categorizationResult = await categorizeTransaction(supabase, {
      merchantName: body.merchant_name,
      chapterId: user.chapter_id,
      source: source,
      useAI: USE_AI_CATEGORIZATION,
    });

    console.log(`[SUGGEST_CATEGORY] Suggested: ${categorizationResult.category_name} (${categorizationResult.matched_by})`);

    // Return suggestion
    return corsJsonResponse(
      {
        success: true,
        category_id: categorizationResult.category_id,
        category_name: categorizationResult.category_name,
        matched_by: categorizationResult.matched_by,
        confidence: categorizationResult.confidence,
        rule_id: categorizationResult.rule_id,
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
