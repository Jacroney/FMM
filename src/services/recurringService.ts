import { supabase } from './supabaseClient';
import {
  RecurringTransaction,
  RecurringTransactionDetail,
  AutomationAudit,
  ForecastBalance
} from './types';

export class RecurringService {
  // ============================================================================
  // RECURRING TRANSACTIONS CRUD
  // ============================================================================

  /**
   * Get all recurring transactions for a chapter
   */
  static async getRecurringTransactions(
    chapterId: string
  ): Promise<RecurringTransactionDetail[]> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select(`
        *,
        category:budget_categories(name, type),
        period:budget_periods(name)
      `)
      .eq('chapter_id', chapterId)
      .order('next_due_date', { ascending: true });

    if (error) {
      console.error('Error fetching recurring transactions:', error);
      throw new Error(`Failed to fetch recurring transactions: ${error.message}`);
    }

    // Transform the data to match RecurringTransactionDetail
    return (data || []).map(item => ({
      ...item,
      category_name: item.category?.name || null,
      category_type: item.category?.type || null,
      period_name: item.period?.name || null,
    }));
  }

  /**
   * Get a single recurring transaction by ID
   */
  static async getRecurringTransaction(
    id: string
  ): Promise<RecurringTransaction> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch recurring transaction: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new recurring transaction
   */
  static async createRecurringTransaction(
    transaction: Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<RecurringTransaction> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create recurring transaction: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a recurring transaction
   */
  static async updateRecurringTransaction(
    id: string,
    updates: Partial<Omit<RecurringTransaction, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>>
  ): Promise<RecurringTransaction> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update recurring transaction: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a recurring transaction
   */
  static async deleteRecurringTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete recurring transaction: ${error.message}`);
    }
  }

  /**
   * Toggle auto-post status
   */
  static async toggleAutoPost(id: string, autoPost: boolean): Promise<void> {
    await this.updateRecurringTransaction(id, { auto_post: autoPost });
  }

  /**
   * Toggle active status
   */
  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.updateRecurringTransaction(id, { is_active: isActive });
  }

  // ============================================================================
  // CASH FLOW FORECASTING
  // ============================================================================

  /**
   * Get forecast balance data for a chapter
   */
  static async getForecastBalance(
    chapterId: string,
    daysAhead: number = 90
  ): Promise<ForecastBalance[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('forecast_balance_view')
      .select('*')
      .eq('chapter_id', chapterId)
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching forecast balance:', error);
      throw new Error(`Failed to fetch forecast balance: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get next upcoming recurring transaction
   */
  static async getNextRecurring(chapterId: string): Promise<RecurringTransaction | null> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('chapter_id', chapterId)
      .eq('is_active', true)
      .gte('next_due_date', new Date().toISOString().split('T')[0])
      .order('next_due_date', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error fetching next recurring transaction:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  }

  // ============================================================================
  // AUTOMATION & AUDIT
  // ============================================================================

  /**
   * Manually trigger recurring transaction processing
   */
  static async processRecurringTransactions(): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-recurring', {
        method: 'POST',
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        result: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get automation audit logs
   */
  static async getAutomationAudit(
    chapterId?: string,
    limit: number = 50
  ): Promise<AutomationAudit[]> {
    let query = supabase
      .from('automation_audit')
      .select('*')
      .order('run_time', { ascending: false })
      .limit(limit);

    if (chapterId) {
      query = query.eq('chapter_id', chapterId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching automation audit:', error);
      throw new Error(`Failed to fetch automation audit: ${error.message}`);
    }

    return data || [];
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Calculate the next due date based on frequency
   */
  static calculateNextDueDate(currentDate: Date, frequency: RecurringTransaction['frequency']): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  /**
   * Format frequency for display
   */
  static formatFrequency(frequency: RecurringTransaction['frequency']): string {
    const frequencyMap: Record<RecurringTransaction['frequency'], string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    };

    return frequencyMap[frequency] || frequency;
  }

  /**
   * Get frequency options for dropdowns
   */
  static getFrequencyOptions(): Array<{ value: RecurringTransaction['frequency']; label: string }> {
    return [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Bi-weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' },
    ];
  }
}
