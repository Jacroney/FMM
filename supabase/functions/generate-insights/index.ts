import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface Insight {
  chapter_id: string;
  insight_type: 'budget_warning' | 'anomaly' | 'optimization' | 'forecast' | 'pattern' | 'recommendation' | 'alert';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  related_data: any;
  suggested_actions: any[];
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCorsPreflightRequest(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

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
    const { chapter_id, clear_existing } = await req.json();
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

    // Clear existing insights if requested
    if (clear_existing) {
      await supabase
        .from('ai_insights')
        .delete()
        .eq('chapter_id', chapter_id)
        .eq('is_dismissed', false);
    }

    const insights: Insight[] = [];

    // ============================================================================
    // 1. BUDGET WARNINGS - Detect overspending
    // ============================================================================
    const { data: budgets } = await supabase
      .from('budget_summary')
      .select('*')
      .eq('chapter_id', chapter_id);

    if (budgets) {
      for (const budget of budgets) {
        const percentUsed = budget.percent_used || 0;

        if (percentUsed >= 100) {
          // Over budget - HIGH priority
          const overage = Math.abs(budget.remaining);
          insights.push({
            chapter_id,
            insight_type: 'budget_warning',
            title: `${budget.category} is over budget`,
            description: `You've spent $${budget.spent.toFixed(2)} of $${budget.allocated.toFixed(2)} allocated (${percentUsed.toFixed(1)}%). You are $${overage.toFixed(2)} over budget for ${budget.period}.`,
            priority: 'high',
            related_data: {
              category: budget.category,
              category_id: budget.category_id,
              period: budget.period,
              allocated: budget.allocated,
              spent: budget.spent,
              overage: overage,
            },
            suggested_actions: [
              { text: 'Review recent transactions in this category', action: 'view_transactions', data: { category_id: budget.category_id } },
              { text: 'Reduce spending in this category', action: 'reduce_spending' },
              { text: 'Reallocate budget from other categories', action: 'reallocate_budget' },
            ],
          });
        } else if (percentUsed >= 80) {
          // Nearly at budget - MEDIUM priority
          insights.push({
            chapter_id,
            insight_type: 'budget_warning',
            title: `${budget.category} approaching budget limit`,
            description: `You've used ${percentUsed.toFixed(1)}% of your ${budget.category} budget ($${budget.spent.toFixed(2)} of $${budget.allocated.toFixed(2)}). Only $${budget.remaining.toFixed(2)} remaining.`,
            priority: 'medium',
            related_data: {
              category: budget.category,
              category_id: budget.category_id,
              period: budget.period,
              allocated: budget.allocated,
              spent: budget.spent,
              remaining: budget.remaining,
            },
            suggested_actions: [
              { text: 'Monitor spending carefully', action: 'monitor' },
              { text: 'Set spending limit alerts', action: 'set_alerts' },
            ],
          });
        }
      }
    }

    // ============================================================================
    // 2. CASH FLOW ALERTS - Detect low balance + upcoming expenses
    // ============================================================================
    const { data: plaidAccounts } = await supabase
      .from('plaid_accounts')
      .select('current_balance')
      .eq('chapter_id', chapter_id)
      .eq('is_active', true);

    const totalBankBalance = plaidAccounts?.reduce(
      (sum: number, acc: any) => sum + (acc.current_balance || 0),
      0
    ) || 0;

    // Get upcoming recurring expenses (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: upcomingRecurring } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('chapter_id', chapter_id)
      .eq('is_active', true)
      .lte('next_due_date', sevenDaysFromNow.toISOString().split('T')[0]);

    const upcomingTotal = upcomingRecurring?.reduce(
      (sum: number, rec: any) => sum + Math.abs(rec.amount),
      0
    ) || 0;

    if (totalBankBalance > 0 && upcomingTotal > 0) {
      const shortfall = totalBankBalance - upcomingTotal;

      if (shortfall < 0) {
        // Will run out of money - URGENT
        insights.push({
          chapter_id,
          insight_type: 'alert',
          title: 'Cash flow warning: Insufficient funds',
          description: `Current balance: $${totalBankBalance.toFixed(2)}. Upcoming expenses in next 7 days: $${upcomingTotal.toFixed(2)}. Shortfall: $${Math.abs(shortfall).toFixed(2)}.`,
          priority: 'urgent',
          related_data: {
            bank_balance: totalBankBalance,
            upcoming_expenses: upcomingTotal,
            shortfall: Math.abs(shortfall),
            upcoming_count: upcomingRecurring?.length || 0,
          },
          suggested_actions: [
            { text: 'Collect outstanding dues immediately', action: 'collect_dues' },
            { text: 'Delay non-critical expenses', action: 'delay_expenses' },
            { text: 'Review upcoming recurring payments', action: 'view_recurring' },
          ],
        });
      } else if (shortfall < 500) {
        // Low balance - HIGH priority
        insights.push({
          chapter_id,
          insight_type: 'alert',
          title: 'Low balance alert',
          description: `After upcoming expenses ($${upcomingTotal.toFixed(2)}), you'll have only $${shortfall.toFixed(2)} remaining.`,
          priority: 'high',
          related_data: {
            bank_balance: totalBankBalance,
            upcoming_expenses: upcomingTotal,
            remaining: shortfall,
          },
          suggested_actions: [
            { text: 'Monitor spending carefully', action: 'monitor' },
            { text: 'Follow up on outstanding dues', action: 'collect_dues' },
          ],
        });
      }
    }

    // ============================================================================
    // 3. RECURRING PAYMENT REMINDERS - Upcoming due dates
    // ============================================================================
    if (upcomingRecurring && upcomingRecurring.length > 0) {
      const recurringList = upcomingRecurring.map((r: any) =>
        `${r.name}: $${Math.abs(r.amount).toFixed(2)} due ${new Date(r.next_due_date).toLocaleDateString()}`
      ).join(', ');

      insights.push({
        chapter_id,
        insight_type: 'alert',
        title: `${upcomingRecurring.length} recurring payment${upcomingRecurring.length > 1 ? 's' : ''} due this week`,
        description: `Total: $${upcomingTotal.toFixed(2)}. ${recurringList}`,
        priority: 'low',
        related_data: {
          count: upcomingRecurring.length,
          total: upcomingTotal,
          items: upcomingRecurring,
        },
        suggested_actions: [
          { text: 'View all recurring payments', action: 'view_recurring' },
          { text: 'Ensure sufficient funds', action: 'check_balance' },
        ],
      });
    }

    // ============================================================================
    // 4. ANOMALY DETECTION - Unusual transactions
    // ============================================================================
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get recent transactions
    const { data: recentTransactions } = await supabase
      .from('expense_details')
      .select('*')
      .eq('chapter_id', chapter_id)
      .gte('transaction_date', thirtyDaysAgo.toISOString())
      .order('transaction_date', { ascending: false })
      .limit(50);

    // Get historical averages by category (90 days)
    const { data: historicalExpenses } = await supabase
      .from('expense_details')
      .select('category_id, category_name, amount')
      .eq('chapter_id', chapter_id)
      .gte('transaction_date', ninetyDaysAgo.toISOString())
      .lt('transaction_date', thirtyDaysAgo.toISOString());

    if (recentTransactions && historicalExpenses) {
      // Calculate average by category
      const categoryAverages = new Map<string, number>();
      const categoryCounts = new Map<string, number>();

      for (const exp of historicalExpenses) {
        const current = categoryAverages.get(exp.category_id) || 0;
        const count = categoryCounts.get(exp.category_id) || 0;
        categoryAverages.set(exp.category_id, current + Math.abs(exp.amount));
        categoryCounts.set(exp.category_id, count + 1);
      }

      // Check for anomalies
      for (const txn of recentTransactions) {
        const avgTotal = categoryAverages.get(txn.category_id) || 0;
        const count = categoryCounts.get(txn.category_id) || 1;
        const avgPerTransaction = avgTotal / count;

        if (avgPerTransaction > 0 && Math.abs(txn.amount) > avgPerTransaction * 2.5) {
          // Transaction is 2.5x above average - potential anomaly
          const multiplier = (Math.abs(txn.amount) / avgPerTransaction).toFixed(1);
          insights.push({
            chapter_id,
            insight_type: 'anomaly',
            title: 'Unusual transaction detected',
            description: `$${Math.abs(txn.amount).toFixed(2)} for "${txn.description}" is ${multiplier}x your average ${txn.category_name} expense ($${avgPerTransaction.toFixed(2)}).`,
            priority: 'high',
            related_data: {
              transaction_id: txn.id,
              amount: Math.abs(txn.amount),
              description: txn.description,
              category: txn.category_name,
              average: avgPerTransaction,
              multiplier: parseFloat(multiplier),
              date: txn.transaction_date,
            },
            suggested_actions: [
              { text: 'Verify this transaction is legitimate', action: 'verify_transaction', data: { transaction_id: txn.id } },
              { text: 'Check if this was a one-time expense', action: 'review' },
            ],
          });
        }
      }
    }

    // ============================================================================
    // 5. DUES COLLECTION ALERTS
    // ============================================================================
    const { data: duesStats } = await supabase
      .from('chapter_dues_stats')
      .select('*')
      .eq('chapter_id', chapter_id)
      .limit(1);

    if (duesStats && duesStats.length > 0) {
      const stats = duesStats[0];

      if (stats.members_overdue > 0) {
        // Overdue members - MEDIUM priority
        insights.push({
          chapter_id,
          insight_type: 'recommendation',
          title: `${stats.members_overdue} member${stats.members_overdue > 1 ? 's' : ''} overdue on dues`,
          description: `${stats.members_overdue} of ${stats.total_members} members are past the due date. Outstanding amount: $${stats.total_outstanding.toFixed(2)} (${(100 - stats.payment_rate).toFixed(1)}% unpaid).`,
          priority: 'medium',
          related_data: {
            overdue_count: stats.members_overdue,
            outstanding: stats.total_outstanding,
            payment_rate: stats.payment_rate,
            period: stats.period_name,
          },
          suggested_actions: [
            { text: 'Send payment reminders', action: 'send_reminders' },
            { text: 'View overdue members', action: 'view_members', data: { filter: 'overdue' } },
            { text: 'Apply late fees', action: 'apply_late_fees' },
          ],
        });
      } else if (stats.payment_rate < 75) {
        // Low collection rate - LOW priority
        insights.push({
          chapter_id,
          insight_type: 'recommendation',
          title: 'Low dues collection rate',
          description: `Only ${stats.payment_rate.toFixed(1)}% of members have paid (${stats.members_paid} of ${stats.total_members}). Expected: $${stats.total_expected.toFixed(2)}, Collected: $${stats.total_collected.toFixed(2)}.`,
          priority: 'low',
          related_data: {
            payment_rate: stats.payment_rate,
            members_paid: stats.members_paid,
            total_members: stats.total_members,
            collected: stats.total_collected,
            expected: stats.total_expected,
          },
          suggested_actions: [
            { text: 'Send payment reminders', action: 'send_reminders' },
            { text: 'Review dues configuration', action: 'view_dues_config' },
          ],
        });
      }
    }

    // ============================================================================
    // 6. SPENDING TRENDS & FORECASTS
    // ============================================================================
    if (budgets) {
      for (const budget of budgets) {
        // Calculate days remaining in period
        const endDate = new Date(budget.end_date);
        const today = new Date();
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        const startDate = new Date(budget.start_date);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = totalDays - daysRemaining;

        if (daysRemaining > 0 && daysElapsed > 0) {
          // Calculate daily burn rate
          const dailyBurnRate = budget.spent / daysElapsed;
          const projectedTotal = budget.spent + (dailyBurnRate * daysRemaining);
          const projectedOverage = projectedTotal - budget.allocated;

          if (projectedOverage > 0 && projectedOverage / budget.allocated > 0.1) {
            // Projected to go >10% over budget - MEDIUM priority
            const percentOver = (projectedOverage / budget.allocated * 100).toFixed(1);
            insights.push({
              chapter_id,
              insight_type: 'forecast',
              title: `${budget.category} trending over budget`,
              description: `At current rate ($${dailyBurnRate.toFixed(2)}/day), you'll spend $${projectedTotal.toFixed(2)} by end of ${budget.period} (${percentOver}% over budget). Days remaining: ${daysRemaining}.`,
              priority: 'medium',
              related_data: {
                category: budget.category,
                category_id: budget.category_id,
                current_spent: budget.spent,
                allocated: budget.allocated,
                projected_total: projectedTotal,
                projected_overage: projectedOverage,
                daily_rate: dailyBurnRate,
                days_remaining: daysRemaining,
              },
              suggested_actions: [
                { text: 'Reduce daily spending to stay on budget', action: 'reduce_spending' },
                { text: 'Review recent transactions', action: 'view_transactions', data: { category_id: budget.category_id } },
                { text: 'Adjust budget allocation', action: 'adjust_budget' },
              ],
            });
          }
        }
      }
    }

    // ============================================================================
    // 7. OPTIMIZATION RECOMMENDATIONS
    // ============================================================================
    // Compare spending across categories to identify potential savings
    if (budgets && budgets.length > 1) {
      const sortedByPercent = [...budgets].sort((a, b) => b.percent_used - a.percent_used);

      // Find categories that are significantly under-utilized
      for (const budget of budgets) {
        if (budget.percent_used < 50 && budget.allocated > 500) {
          const unused = budget.remaining;
          insights.push({
            chapter_id,
            insight_type: 'optimization',
            title: `${budget.category} has $${unused.toFixed(2)} unused`,
            description: `You've only used ${budget.percent_used.toFixed(1)}% of your ${budget.category} budget. Consider reallocating $${unused.toFixed(2)} to categories that need more funding.`,
            priority: 'low',
            related_data: {
              category: budget.category,
              category_id: budget.category_id,
              allocated: budget.allocated,
              spent: budget.spent,
              unused: unused,
              percent_used: budget.percent_used,
            },
            suggested_actions: [
              { text: 'Reallocate to over-budget categories', action: 'reallocate_budget' },
              { text: 'Review if allocation is too high', action: 'review_budget' },
            ],
          });
        }
      }
    }

    console.log(`Generated ${insights.length} insights for chapter ${chapter_id}`);

    // Insert insights into database
    if (insights.length > 0) {
      const { error: insertError } = await supabase
        .from('ai_insights')
        .insert(insights);

      if (insertError) {
        console.error('Error inserting insights:', insertError);
        throw insertError;
      }
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        insights_generated: insights.length,
        chapter_id,
        breakdown: {
          budget_warnings: insights.filter(i => i.insight_type === 'budget_warning').length,
          alerts: insights.filter(i => i.insight_type === 'alert').length,
          anomalies: insights.filter(i => i.insight_type === 'anomaly').length,
          forecasts: insights.filter(i => i.insight_type === 'forecast').length,
          recommendations: insights.filter(i => i.insight_type === 'recommendation').length,
          optimizations: insights.filter(i => i.insight_type === 'optimization').length,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error in generate-insights:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
