import { supabase } from './supabaseClient';
import {
  Expense,
  ExpenseDetail,
  BudgetCategory,
  BudgetPeriod,
  BudgetSummary
} from './types';

/**
 * Unified Expense Service
 *
 * This service handles all expense/transaction operations for the application.
 * It replaces the previous split between transactionService and expenseService.
 *
 * Features:
 * - Full CRUD operations on expenses
 * - Rich filtering and querying
 * - Integration with budget categories and periods
 * - CSV import/export support
 * - Real-time updates via Supabase subscriptions
 */
export class ExpenseService {

  // ============================================
  // EXPENSE CRUD OPERATIONS
  // ============================================

  /**
   * Get all expenses for a chapter with full details
   */
  static async getExpenses(
    chapterId: string,
    options?: {
      periodId?: string;
      categoryId?: string;
      startDate?: string;
      endDate?: string;
      status?: 'pending' | 'completed' | 'cancelled';
      limit?: number;
    }
  ): Promise<ExpenseDetail[]> {
    if (!chapterId) {
      console.error('Chapter ID is required');
      return [];
    }

    try {
      let query = supabase
        .from('expense_details')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (options?.periodId) {
        query = query.eq('period_id', options.periodId);
      }

      if (options?.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.startDate) {
        query = query.gte('transaction_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('transaction_date', options.endDate);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching expenses:', error);
        return [];
      }

      return data as ExpenseDetail[];
    } catch (error) {
      console.error('Error in getExpenses:', error);
      return [];
    }
  }

  /**
   * Get a single expense by ID with full details
   */
  static async getExpense(id: string): Promise<ExpenseDetail | null> {
    try {
      const { data, error } = await supabase
        .from('expense_details')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ExpenseDetail;
    } catch (error) {
      console.error('Error fetching expense:', error);
      return null;
    }
  }

  /**
   * Create a new expense
   */
  static async addExpense(chapterId: string, expense: Omit<Expense, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          chapter_id: chapterId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  }

  /**
   * Bulk create expenses (useful for CSV import)
   */
  static async addExpenses(chapterId: string, expenses: Omit<Expense, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>[]): Promise<Expense[]> {
    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    try {
      const expensesWithChapter = expenses.map(exp => ({
        ...exp,
        chapter_id: chapterId,
      }));

      const { data, error } = await supabase
        .from('expenses')
        .insert(expensesWithChapter)
        .select();

      if (error) throw error;
      return data as Expense[];
    } catch (error) {
      console.error('Error adding expenses:', error);
      throw error;
    }
  }

  /**
   * Update an existing expense
   */
  static async updateExpense(id: string, updates: Partial<Omit<Expense, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>>): Promise<Expense> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  /**
   * Delete an expense
   */
  static async deleteExpense(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // ============================================
  // BUDGET CATEGORY OPERATIONS
  // ============================================

  /**
   * Get all active budget categories for a chapter
   */
  static async getCategories(chapterId: string): Promise<BudgetCategory[]> {
    if (!chapterId) {
      console.error('Chapter ID is required');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_active', true)
        .order('type')
        .order('name');

      if (error) {
        console.warn('Budget categories table not available:', error.message);
        return [];
      }

      return data as BudgetCategory[];
    } catch (error) {
      console.warn('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Create a new budget category
   */
  static async addCategory(chapterId: string, category: Omit<BudgetCategory, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>): Promise<BudgetCategory> {
    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert({
          ...category,
          chapter_id: chapterId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetCategory;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  /**
   * Update a budget category
   */
  static async updateCategory(id: string, updates: Partial<Omit<BudgetCategory, 'id' | 'chapter_id' | 'created_at' | 'updated_at'>>): Promise<BudgetCategory> {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BudgetCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // ============================================
  // BUDGET PERIOD OPERATIONS
  // ============================================

  /**
   * Get all budget periods for a chapter
   */
  static async getPeriods(chapterId: string): Promise<BudgetPeriod[]> {
    if (!chapterId) {
      console.error('Chapter ID is required');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('start_date', { ascending: false });

      if (error) {
        console.warn('Budget periods table not available:', error.message);
        return [];
      }

      return data as BudgetPeriod[];
    } catch (error) {
      console.warn('Error fetching periods:', error);
      return [];
    }
  }

  /**
   * Get the current budget period for a chapter
   */
  static async getCurrentPeriod(chapterId: string): Promise<BudgetPeriod | null> {
    if (!chapterId) {
      console.error('Chapter ID is required');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_current', true)
        .single();

      if (error) {
        console.warn('Current period not available:', error.message);
        return null;
      }

      return data as BudgetPeriod;
    } catch (error) {
      console.warn('Error fetching current period:', error);
      return null;
    }
  }

  /**
   * Create a new budget period
   */
  static async addPeriod(chapterId: string, period: Omit<BudgetPeriod, 'id' | 'chapter_id' | 'created_at'>): Promise<BudgetPeriod> {
    if (!chapterId) {
      throw new Error('Chapter ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .insert({
          ...period,
          chapter_id: chapterId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetPeriod;
    } catch (error) {
      console.error('Error adding period:', error);
      throw error;
    }
  }

  // ============================================
  // BUDGET SUMMARY & ANALYTICS
  // ============================================

  /**
   * Get budget summary for a period
   */
  static async getBudgetSummary(chapterId: string, periodName?: string): Promise<BudgetSummary[]> {
    if (!chapterId) {
      console.error('Chapter ID is required');
      return [];
    }

    try {
      let query = supabase
        .from('budget_summary')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('start_date', { ascending: false })
        .order('category_type')
        .order('category');

      if (periodName) {
        query = query.eq('period', periodName);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Budget summary view not available:', error.message);
        return [];
      }

      return data as BudgetSummary[];
    } catch (error) {
      console.warn('Error fetching budget summary:', error);
      return [];
    }
  }

  /**
   * Get spending totals by category type for a period
   */
  static async getTotalsByPeriod(chapterId: string, periodName: string) {
    if (!chapterId) {
      console.warn('Chapter ID is required');
      return {
        'Fixed Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Operational Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Event Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Grand Total': { allocated: 0, spent: 0, remaining: 0 }
      };
    }

    try {
      const summaryData = await this.getBudgetSummary(chapterId, periodName);

      const totals = {
        'Fixed Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Operational Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Event Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Grand Total': { allocated: 0, spent: 0, remaining: 0 }
      };

      summaryData.forEach(item => {
        if (item.category_type in totals) {
          totals[item.category_type].allocated += item.allocated;
          totals[item.category_type].spent += item.spent;
          totals[item.category_type].remaining += item.remaining;
        }
        totals['Grand Total'].allocated += item.allocated;
        totals['Grand Total'].spent += item.spent;
        totals['Grand Total'].remaining += item.remaining;
      });

      return totals;
    } catch (error) {
      console.warn('Error fetching totals by period:', error);
      return {
        'Fixed Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Operational Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Event Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Grand Total': { allocated: 0, spent: 0, remaining: 0 }
      };
    }
  }

  /**
   * Get expense statistics for a period
   */
  static async getExpenseStats(chapterId: string, periodId?: string) {
    const expenses = await this.getExpenses(chapterId, { periodId });

    return {
      total: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      pending: expenses.filter(e => e.status === 'pending').length,
      completed: expenses.filter(e => e.status === 'completed').length,
      cancelled: expenses.filter(e => e.status === 'cancelled').length,
      averageAmount: expenses.length > 0
        ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length
        : 0,
      byCategory: expenses.reduce((acc, exp) => {
        if (!acc[exp.category_name]) {
          acc[exp.category_name] = { count: 0, total: 0 };
        }
        acc[exp.category_name].count++;
        acc[exp.category_name].total += exp.amount;
        return acc;
      }, {} as Record<string, { count: number; total: number }>),
    };
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Initialize default budget structure for a new chapter
   *
   * @deprecated This function is no longer used. Budget setup is now handled
   * through the BudgetSetupWizard component which provides a better user experience
   * with recommendations and customization options.
   */
  static async initializeChapterBudget(chapterId: string): Promise<void> {
    console.warn('initializeChapterBudget is deprecated. Use BudgetSetupWizard component instead.');

    // This function is kept for backwards compatibility but should not be used
    // Budget initialization is now handled through the UI wizard
    throw new Error('This function is deprecated. Please use the BudgetSetupWizard component.');
  }

  /**
   * Check if a chapter has budget structure initialized
   */
  static async isBudgetInitialized(chapterId: string): Promise<boolean> {
    const [categories, periods] = await Promise.all([
      this.getCategories(chapterId),
      this.getPeriods(chapterId)
    ]);

    return categories.length > 0 && periods.length > 0;
  }
}
