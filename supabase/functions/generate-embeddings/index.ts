import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';

interface EmbeddingData {
  content: string;
  content_type: string;
  source_table?: string;
  source_id?: string;
  source_metadata?: any;
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
    const { chapter_id, force_refresh } = await req.json();
    if (!chapter_id) {
      return new Response(
        JSON.stringify({ error: 'Missing chapter_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has access to this chapter
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('chapter_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.chapter_id !== chapter_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to chapter' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if embeddings already exist (unless force_refresh)
    if (!force_refresh) {
      const { data: existingEmbeddings, error: checkError } = await supabase
        .from('ai_knowledge_base')
        .select('id, created_at')
        .eq('chapter_id', chapter_id)
        .limit(1);

      if (!checkError && existingEmbeddings && existingEmbeddings.length > 0) {
        const { count } = await supabase
          .from('ai_knowledge_base')
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', chapter_id);

        return new Response(
          JSON.stringify({
            message: 'Embeddings already exist. Use force_refresh=true to regenerate.',
            embedding_count: count,
            last_updated: existingEmbeddings[0].created_at,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Clear existing embeddings if force refresh
    if (force_refresh) {
      await supabase
        .from('ai_knowledge_base')
        .delete()
        .eq('chapter_id', chapter_id);
    }

    const embeddingsToCreate: EmbeddingData[] = [];

    // ============================================================================
    // 1. TRANSACTION EMBEDDINGS
    // ============================================================================
    const { data: expenses } = await supabase
      .from('expense_details')
      .select('*')
      .eq('chapter_id', chapter_id)
      .eq('status', 'completed')
      .order('transaction_date', { ascending: false })
      .limit(500);

    if (expenses) {
      for (const expense of expenses) {
        const date = new Date(expense.transaction_date).toLocaleDateString();
        const content = `${expense.category_name} transaction: ${expense.description} for ${Math.abs(expense.amount).toFixed(2)} USD on ${date}. Payment method: ${expense.payment_method || 'unknown'}. Source: ${expense.source}. ${expense.notes ? `Notes: ${expense.notes}` : ''}`;

        embeddingsToCreate.push({
          content,
          content_type: 'transaction',
          source_table: 'expenses',
          source_id: expense.id,
          source_metadata: {
            amount: expense.amount,
            category: expense.category_name,
            date: expense.transaction_date,
            vendor: expense.vendor,
          },
        });
      }
    }

    // ============================================================================
    // 2. BUDGET SUMMARY EMBEDDINGS
    // ============================================================================
    const { data: budgets } = await supabase
      .from('budget_summary')
      .select('*')
      .eq('chapter_id', chapter_id);

    if (budgets) {
      for (const budget of budgets) {
        const percentUsed = budget.percent_used || 0;
        const status = percentUsed > 100 ? 'over budget' : percentUsed > 80 ? 'nearly at budget' : 'under budget';
        const content = `${budget.category} budget for ${budget.period} ${budget.fiscal_year}: ${budget.allocated.toFixed(2)} USD allocated, ${budget.spent.toFixed(2)} USD spent (${percentUsed.toFixed(1)}% used), ${budget.remaining.toFixed(2)} USD remaining. Status: ${status}. Category type: ${budget.category_type}.`;

        embeddingsToCreate.push({
          content,
          content_type: 'budget',
          source_table: 'budgets',
          source_id: budget.budget_id,
          source_metadata: {
            category: budget.category,
            period: budget.period,
            allocated: budget.allocated,
            spent: budget.spent,
            percent_used: percentUsed,
          },
        });
      }
    }

    // ============================================================================
    // 3. RECURRING TRANSACTION EMBEDDINGS
    // ============================================================================
    const { data: recurring } = await supabase
      .from('recurring_transactions')
      .select('*, budget_categories(name)')
      .eq('chapter_id', chapter_id)
      .eq('is_active', true);

    if (recurring) {
      for (const rec of recurring) {
        const nextDue = new Date(rec.next_due_date).toLocaleDateString();
        const categoryName = rec.budget_categories?.name || 'Uncategorized';
        const content = `Recurring ${rec.amount >= 0 ? 'income' : 'expense'}: ${rec.name}${rec.description ? ` - ${rec.description}` : ''} for ${Math.abs(rec.amount).toFixed(2)} USD. Frequency: ${rec.frequency}. Next due: ${nextDue}. Category: ${categoryName}. Auto-post: ${rec.auto_post ? 'yes' : 'no'}.`;

        embeddingsToCreate.push({
          content,
          content_type: 'recurring',
          source_table: 'recurring_transactions',
          source_id: rec.id,
          source_metadata: {
            name: rec.name,
            amount: rec.amount,
            frequency: rec.frequency,
            next_due_date: rec.next_due_date,
          },
        });
      }
    }

    // ============================================================================
    // 4. SPENDING PATTERN EMBEDDINGS (Category Aggregations)
    // ============================================================================
    const { data: categoryPatterns } = await supabase
      .from('expenses')
      .select('category_id, amount, budget_categories(name)')
      .eq('chapter_id', chapter_id)
      .eq('status', 'completed')
      .gte('transaction_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (categoryPatterns) {
      const patterns = new Map<string, { total: number; count: number; name: string }>();

      for (const exp of categoryPatterns) {
        const categoryName = exp.budget_categories?.name || 'Uncategorized';
        if (!patterns.has(categoryName)) {
          patterns.set(categoryName, { total: 0, count: 0, name: categoryName });
        }
        const p = patterns.get(categoryName)!;
        p.total += Math.abs(exp.amount);
        p.count += 1;
      }

      for (const [_, pattern] of patterns) {
        const avgPerTransaction = pattern.total / pattern.count;
        const avgPerMonth = (pattern.total / 90) * 30;
        const content = `${pattern.name} spending pattern (last 90 days): ${pattern.total.toFixed(2)} USD total across ${pattern.count} transactions. Average ${avgPerTransaction.toFixed(2)} USD per transaction. Monthly average: ${avgPerMonth.toFixed(2)} USD.`;

        embeddingsToCreate.push({
          content,
          content_type: 'insight',
          source_table: null,
          source_id: null,
          source_metadata: {
            category: pattern.name,
            total_90_days: pattern.total,
            transaction_count: pattern.count,
            avg_per_month: avgPerMonth,
          },
        });
      }
    }

    // ============================================================================
    // 5. DUES STATUS EMBEDDINGS
    // ============================================================================
    const { data: duesStats } = await supabase
      .from('chapter_dues_stats')
      .select('*')
      .eq('chapter_id', chapter_id)
      .limit(1);

    if (duesStats && duesStats.length > 0) {
      const stats = duesStats[0];
      const content = `Member dues status for ${stats.period_name} ${stats.fiscal_year}: ${stats.total_members} total members, ${stats.members_paid} paid (${stats.payment_rate.toFixed(1)}% payment rate), ${stats.members_pending} pending, ${stats.members_overdue} overdue. Expected: ${stats.total_expected.toFixed(2)} USD, Collected: ${stats.total_collected.toFixed(2)} USD, Outstanding: ${stats.total_outstanding.toFixed(2)} USD. Late fees: ${stats.total_late_fees.toFixed(2)} USD.`;

      embeddingsToCreate.push({
        content,
        content_type: 'insight',
        source_table: 'member_dues',
        source_id: null,
        source_metadata: {
          period: stats.period_name,
          payment_rate: stats.payment_rate,
          total_expected: stats.total_expected,
          total_collected: stats.total_collected,
        },
      });
    }

    console.log(`Generated ${embeddingsToCreate.length} text descriptions for embedding`);

    // ============================================================================
    // 6. GENERATE EMBEDDINGS VIA OPENAI
    // ============================================================================
    let embeddingsCreated = 0;
    const batchSize = 100; // OpenAI allows up to 2048 inputs per request, we'll use 100 for safety

    for (let i = 0; i < embeddingsToCreate.length; i += batchSize) {
      const batch = embeddingsToCreate.slice(i, i + batchSize);
      const texts = batch.map(e => e.content);

      try {
        // Call OpenAI Embeddings API
        const embeddingResponse = await fetch(OPENAI_EMBEDDING_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: texts,
          }),
        });

        if (!embeddingResponse.ok) {
          const errorData = await embeddingResponse.json();
          console.error('OpenAI embedding error:', errorData);
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embeddings = embeddingData.data;

        // Store embeddings in database
        const records = batch.map((item, idx) => ({
          chapter_id,
          content: item.content,
          embedding: embeddings[idx].embedding,
          content_type: item.content_type,
          source_table: item.source_table,
          source_id: item.source_id,
          source_metadata: item.source_metadata,
        }));

        const { error: insertError } = await supabase
          .from('ai_knowledge_base')
          .insert(records);

        if (insertError) {
          console.error('Error inserting embeddings:', insertError);
        } else {
          embeddingsCreated += records.length;
        }
      } catch (error) {
        console.error('Error in batch embedding:', error);
      }
    }

    console.log(`Successfully created ${embeddingsCreated} embeddings`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        embeddings_created: embeddingsCreated,
        chapter_id,
        message: 'Knowledge base updated successfully',
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
    console.error('Error in generate-embeddings:', error);
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
