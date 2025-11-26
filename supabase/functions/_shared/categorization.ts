/**
 * Transaction Categorization Service
 *
 * Automatically categorizes transactions using:
 * 1. Pattern matching against category_rules table
 * 2. AI/LLM fallback for unmatched merchants
 * 3. Default "Uncategorized" category as final fallback
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface CategoryRule {
  id: string;
  chapter_id: string | null;
  source: 'PLAID' | 'MANUAL' | 'CSV_IMPORT' | 'ALL';
  merchant_pattern: string;
  category: string;
  priority: number;
  is_active: boolean;
}

export interface CategorizationResult {
  category_id: string;
  category_name: string;
  matched_by: 'pattern' | 'ai' | 'uncategorized';
  confidence?: number;
  rule_id?: string;
}

export interface CategorizationOptions {
  merchantName: string;
  chapterId: string;
  source: 'PLAID' | 'MANUAL' | 'CSV_IMPORT';
  useAI?: boolean;
  availableCategories?: string[]; // For AI categorization
}

/**
 * Main categorization function
 * Attempts pattern matching first, then AI fallback, then uncategorized
 */
export async function categorizeTransaction(
  supabase: SupabaseClient,
  options: CategorizationOptions
): Promise<CategorizationResult> {
  const { merchantName, chapterId, source, useAI = false } = options;

  console.log(`[Categorization] Starting for merchant: "${merchantName}", source: ${source}`);

  // Step 1: Try pattern matching
  const patternResult = await tryPatternMatch(supabase, merchantName, chapterId, source);
  if (patternResult) {
    console.log(`[Categorization] Pattern match found: ${patternResult.category_name}`);
    return patternResult;
  }

  // Step 2: Try AI categorization if enabled
  if (useAI) {
    console.log('[Categorization] No pattern match, trying AI...');
    const aiResult = await tryAICategorization(supabase, merchantName, chapterId, options.availableCategories);
    if (aiResult) {
      console.log(`[Categorization] AI match found: ${aiResult.category_name}`);
      // Optionally: Save AI result as new rule for future use
      await saveAIResultAsRule(supabase, merchantName, chapterId, aiResult.category_name, source);
      return aiResult;
    }
  }

  // Step 3: Fallback to Uncategorized
  console.log('[Categorization] No match found, using Uncategorized');
  const uncategorizedResult = await getUncategorizedCategory(supabase, chapterId);
  return uncategorizedResult;
}

/**
 * Try to match merchant name against category rules
 * Rules are checked in priority order (highest first)
 */
async function tryPatternMatch(
  supabase: SupabaseClient,
  merchantName: string,
  chapterId: string,
  source: string
): Promise<CategorizationResult | null> {
  try {
    // Fetch rules for this chapter and global rules
    // Source-specific rules OR rules that apply to ALL sources
    const { data: rules, error: rulesError } = await supabase
      .from('category_rules')
      .select('*')
      .or(`chapter_id.eq.${chapterId},chapter_id.is.null`)
      .or(`source.eq.${source},source.eq.ALL`)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError) {
      console.error('[Categorization] Error fetching rules:', rulesError);
      return null;
    }

    if (!rules || rules.length === 0) {
      console.log('[Categorization] No rules found');
      return null;
    }

    // Test each rule's pattern against merchant name
    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.merchant_pattern, 'i'); // Case-insensitive
        if (regex.test(merchantName)) {
          console.log(`[Categorization] Pattern matched: "${rule.merchant_pattern}" -> ${rule.category}`);

          // Find the category_id for this category name
          const { data: category, error: categoryError } = await supabase
            .from('budget_categories')
            .select('id, name')
            .eq('chapter_id', chapterId)
            .eq('name', rule.category)
            .eq('is_active', true)
            .single();

          if (categoryError || !category) {
            console.warn(`[Categorization] Category "${rule.category}" not found for chapter ${chapterId}`);
            continue; // Try next rule
          }

          return {
            category_id: category.id,
            category_name: category.name,
            matched_by: 'pattern',
            rule_id: rule.id,
          };
        }
      } catch (regexError) {
        console.error(`[Categorization] Invalid regex pattern: ${rule.merchant_pattern}`, regexError);
        continue;
      }
    }

    return null; // No pattern matched
  } catch (error) {
    console.error('[Categorization] Error in pattern matching:', error);
    return null;
  }
}

/**
 * Use AI/LLM to categorize transaction
 * This is a placeholder that will be implemented with OpenAI integration
 */
async function tryAICategorization(
  supabase: SupabaseClient,
  merchantName: string,
  chapterId: string,
  availableCategories?: string[]
): Promise<CategorizationResult | null> {
  try {
    // Get available categories for this chapter if not provided
    let categories = availableCategories;
    if (!categories) {
      const { data: categoryData, error: categoryError } = await supabase
        .from('budget_categories')
        .select('name')
        .eq('chapter_id', chapterId)
        .eq('is_active', true);

      if (categoryError || !categoryData) {
        console.error('[Categorization] Error fetching categories for AI:', categoryError);
        return null;
      }

      categories = categoryData.map((c: any) => c.name);
    }

    // Call OpenAI API to categorize
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.warn('[Categorization] OpenAI API key not configured');
      return null;
    }

    const prompt = `You are a financial categorization assistant. Given a merchant name and a list of available categories, determine the most appropriate category.

Merchant: "${merchantName}"

Available categories:
${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Respond with ONLY the category name from the list above that best matches this merchant. If none match well, respond with "Uncategorized".`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: [
          { role: 'system', content: 'You are a financial categorization expert. Respond only with the category name.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error('[Categorization] OpenAI API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    const categoryName = data.choices[0]?.message?.content?.trim();

    if (!categoryName || categoryName === 'Uncategorized') {
      console.log('[Categorization] AI returned no match');
      return null;
    }

    // Verify the category exists and get its ID
    const { data: category, error: categoryError } = await supabase
      .from('budget_categories')
      .select('id, name')
      .eq('chapter_id', chapterId)
      .eq('name', categoryName)
      .eq('is_active', true)
      .single();

    if (categoryError || !category) {
      console.warn(`[Categorization] AI suggested category "${categoryName}" not found`);
      return null;
    }

    console.log(`[Categorization] AI categorized as: ${categoryName}`);
    return {
      category_id: category.id,
      category_name: category.name,
      matched_by: 'ai',
      confidence: 0.8, // Could extract from OpenAI response
    };
  } catch (error) {
    console.error('[Categorization] Error in AI categorization:', error);
    return null;
  }
}

/**
 * Save AI categorization result as a new rule for future use
 * This allows the system to "learn" from AI categorizations
 */
async function saveAIResultAsRule(
  supabase: SupabaseClient,
  merchantName: string,
  chapterId: string,
  categoryName: string,
  source: string
): Promise<void> {
  try {
    // Create a simple pattern from merchant name (escape special regex chars)
    const escapedName = merchantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = `(?i)(${escapedName})`;

    // Insert new rule with medium priority (500)
    const { error } = await supabase
      .from('category_rules')
      .insert({
        chapter_id: chapterId,
        source: source,
        merchant_pattern: pattern,
        category: categoryName,
        priority: 500, // Medium priority (AI-learned rules)
        is_active: true,
      });

    if (error) {
      console.error('[Categorization] Error saving AI result as rule:', error);
    } else {
      console.log(`[Categorization] Saved new rule: "${pattern}" -> ${categoryName}`);
    }
  } catch (error) {
    console.error('[Categorization] Error in saveAIResultAsRule:', error);
  }
}

/**
 * Get or create the "Uncategorized" category for a chapter
 * This is the final fallback when no other categorization works
 */
async function getUncategorizedCategory(
  supabase: SupabaseClient,
  chapterId: string
): Promise<CategorizationResult> {
  try {
    // Try to find existing Uncategorized category
    let { data: category, error: findError } = await supabase
      .from('budget_categories')
      .select('id, name')
      .eq('chapter_id', chapterId)
      .eq('name', 'Uncategorized')
      .eq('is_active', true)
      .maybeSingle();

    // If not found, create it
    if (!category && !findError) {
      console.log('[Categorization] Creating Uncategorized category');

      const { data: newCategory, error: createError } = await supabase
        .from('budget_categories')
        .insert({
          chapter_id: chapterId,
          name: 'Uncategorized',
          type: 'Operational Costs',
          description: 'Transactions that could not be automatically categorized',
          is_active: true,
        })
        .select('id, name')
        .single();

      if (createError || !newCategory) {
        throw new Error(`Failed to create Uncategorized category: ${createError?.message}`);
      }

      category = newCategory;
    }

    if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw findError;
    }

    if (!category) {
      throw new Error('Could not find or create Uncategorized category');
    }

    return {
      category_id: category.id,
      category_name: category.name,
      matched_by: 'uncategorized',
    };
  } catch (error) {
    console.error('[Categorization] Error getting Uncategorized category:', error);
    throw error;
  }
}

/**
 * Bulk categorize multiple transactions
 * More efficient for batch operations like CSV import
 */
export async function categorizeBatch(
  supabase: SupabaseClient,
  transactions: Array<{
    merchantName: string;
    transactionId?: string;
  }>,
  chapterId: string,
  source: 'PLAID' | 'MANUAL' | 'CSV_IMPORT',
  useAI: boolean = false
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();

  // Get all categories once for efficiency
  const { data: categories } = await supabase
    .from('budget_categories')
    .select('name')
    .eq('chapter_id', chapterId)
    .eq('is_active', true);

  const availableCategories = categories?.map((c: any) => c.name) || [];

  // Process each transaction
  for (const transaction of transactions) {
    try {
      const result = await categorizeTransaction(supabase, {
        merchantName: transaction.merchantName,
        chapterId,
        source,
        useAI,
        availableCategories,
      });

      const key = transaction.transactionId || transaction.merchantName;
      results.set(key, result);
    } catch (error) {
      console.error(`[Categorization] Error categorizing ${transaction.merchantName}:`, error);
    }
  }

  return results;
}
