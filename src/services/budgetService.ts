import { supabase } from './supabaseClient';

export interface BudgetSummary {
  period: string;
  period_type: string;
  fiscal_year: number;
  start_date: string;
  category: string;
  category_type: string;
  allocated: number;
  spent: number;
  remaining: number;
  percent_used: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  type: 'Fixed Costs' | 'Operational Costs' | 'Event Costs';
  description: string | null;
  is_active: boolean;
}

export interface BudgetPeriod {
  id: string;
  name: string;
  type: 'Quarter' | 'Semester' | 'Year';
  start_date: string;
  end_date: string;
  fiscal_year: number;
  is_current: boolean;
}

export interface Budget {
  id: string;
  chapter_id: string;
  category_id: string;
  period_id: string;
  allocated: number;
  notes: string | null;
}

export interface Expense {
  id: string;
  budget_id: string | null;
  category_id: string;
  period_id: string;
  amount: number;
  description: string;
  transaction_date: string;
  vendor: string | null;
  payment_method: string | null;
  status: 'pending' | 'completed' | 'cancelled';
}

export class BudgetService {
  static async fetchBudgets(chapterId: string) {
    if (!chapterId) {
      console.error('Chapter ID is required for fetchBudgets');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          budget_categories (
            name,
            type
          ),
          budget_periods (
            name,
            type,
            start_date,
            end_date
          )
        `)
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      // If table doesn't exist or other database error, return empty array
      if (error) {
        console.warn('Budget tables not available:', error.message);
        return [];
      }

      // Transform the data to match the Budget interface in types.ts
      const budgets = (data || []).map(item => ({
        id: item.id,
        chapter_id: item.chapter_id,
        name: item.budget_categories?.name || 'Unknown',
        amount: item.allocated || 0,
        spent: 0, // This would need to be calculated from expenses
        category: item.budget_categories?.type || 'Unknown',
        period: item.budget_periods?.type === 'Quarter' ? 'QUARTERLY' : 'YEARLY',
        startDate: new Date(item.budget_periods?.start_date || new Date()),
        endDate: new Date(item.budget_periods?.end_date || new Date())
      }));

      return budgets;
    } catch (error) {
      console.warn('Error fetching budgets:', error);
      return []; // Return empty array instead of throwing
    }
  }

  static async addBudget(budget: Omit<Budget, 'id'>) {
    if (!budget.chapter_id) {
      throw new Error('Chapter ID is required for addBudget');
    }

    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert(budget)
        .select()
        .single();

      if (error) throw error;

      // Transform to match the Budget interface in types.ts
      return {
        id: data.id,
        chapter_id: data.chapter_id,
        name: 'New Budget', // This would need to be fetched from category
        amount: data.allocated || 0,
        spent: 0,
        category: 'Unknown',
        period: 'QUARTERLY',
        startDate: new Date(),
        endDate: new Date()
      };
    } catch (error) {
      console.error('Error adding budget:', error);
      throw error;
    }
  }

  static async updateBudget(id: string, updates: Partial<Omit<Budget, 'id'>>) {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Transform to match the Budget interface in types.ts
      return {
        id: data.id,
        chapter_id: data.chapter_id,
        name: 'Updated Budget',
        amount: data.allocated || 0,
        spent: 0,
        category: 'Unknown',
        period: 'QUARTERLY',
        startDate: new Date(),
        endDate: new Date()
      };
    } catch (error) {
      console.error('Error updating budget:', error);
      throw error;
    }
  }

  static async deleteBudget(id: string) {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }
  }

  static async getBudgetSummary(chapterId: string, periodName?: string) {
    if (!chapterId) {
      console.error('Chapter ID is required for getBudgetSummary');
      return [];
    }

    try {
      let query = supabase
        .from('budget_summary')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('start_date, category_type, category');

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

  static async getBudgetCategories(chapterId: string) {
    if (!chapterId) {
      console.error('Chapter ID is required for getBudgetCategories');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_active', true)
        .order('type, name');

      if (error) {
        console.warn('Budget categories table not available:', error.message);
        return [];
      }
      return data as BudgetCategory[];
    } catch (error) {
      console.warn('Error fetching budget categories:', error);
      return [];
    }
  }

  static async getBudgetPeriods(chapterId: string) {
    if (!chapterId) {
      console.error('Chapter ID is required for getBudgetPeriods');
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
      console.warn('Error fetching budget periods:', error);
      return [];
    }
  }

  static async getCurrentPeriod(chapterId: string) {
    if (!chapterId) {
      console.error('Chapter ID is required for getCurrentPeriod');
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

  static async updateBudgetAllocation(chapterId: string, categoryId: string, periodId: string, amount: number, notes?: string) {
    if (!chapterId) {
      throw new Error('Chapter ID is required for updateBudgetAllocation');
    }

    try {
      const { data, error } = await supabase
        .from('budgets')
        .upsert({
          chapter_id: chapterId,
          category_id: categoryId,
          period_id: periodId,
          allocated: amount,
          notes: notes || null
        }, {
          onConflict: 'category_id,period_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating budget allocation:', error);
      throw error;
    }
  }

  static async addExpense(chapterId: string, expense: Omit<Expense, 'id'>) {
    if (!chapterId) {
      throw new Error('Chapter ID is required for addExpense');
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...expense, chapter_id: chapterId })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  }

  static async getExpensesByCategory(chapterId: string, categoryId: string, periodId?: string) {
    if (!chapterId) {
      throw new Error('Chapter ID is required for getExpensesByCategory');
    }

    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('category_id', categoryId)
        .order('transaction_date desc');

      if (periodId) {
        query = query.eq('period_id', periodId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Expense[];
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  static async deleteExpense(id: string) {
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

  static async getBudgetsByPeriod(chapterId: string, periodId: string) {
    if (!chapterId) {
      throw new Error('Chapter ID is required for getBudgetsByPeriod');
    }

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          budget_categories (
            id,
            name,
            type
          )
        `)
        .eq('chapter_id', chapterId)
        .eq('period_id', periodId);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching budgets by period:', error);
      throw error;
    }
  }

  static async getTotalsByPeriod(chapterId: string, periodName: string) {
    if (!chapterId) {
      console.warn('Chapter ID is required for getTotalsByPeriod');
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
}