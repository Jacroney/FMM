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
  static async fetchBudgets() {
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
        .order('created_at desc');

      if (error) throw error;

      // Transform the data to match the Budget interface in types.ts
      const budgets = (data || []).map(item => ({
        id: item.id,
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
      console.error('Error fetching budgets:', error);
      throw error;
    }
  }

  static async getBudgetSummary(periodName?: string) {
    try {
      let query = supabase
        .from('budget_summary')
        .select('*')
        .order('start_date, category_type, category');

      if (periodName) {
        query = query.eq('period', periodName);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BudgetSummary[];
    } catch (error) {
      console.error('Error fetching budget summary:', error);
      throw error;
    }
  }

  static async getBudgetCategories() {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('is_active', true)
        .order('type, name');

      if (error) throw error;
      return data as BudgetCategory[];
    } catch (error) {
      console.error('Error fetching budget categories:', error);
      throw error;
    }
  }

  static async getBudgetPeriods() {
    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as BudgetPeriod[];
    } catch (error) {
      console.error('Error fetching budget periods:', error);
      throw error;
    }
  }

  static async getCurrentPeriod() {
    try {
      const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .eq('is_current', true)
        .single();

      if (error) throw error;
      return data as BudgetPeriod;
    } catch (error) {
      console.error('Error fetching current period:', error);
      throw error;
    }
  }

  static async updateBudgetAllocation(categoryId: string, periodId: string, amount: number, notes?: string) {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .upsert({
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

  static async addExpense(expense: Omit<Expense, 'id'>) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  }

  static async getExpensesByCategory(categoryId: string, periodId?: string) {
    try {
      let query = supabase
        .from('expenses')
        .select('*')
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

  static async getBudgetsByPeriod(periodId: string) {
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
        .eq('period_id', periodId);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching budgets by period:', error);
      throw error;
    }
  }

  static async getTotalsByPeriod(periodName: string) {
    try {
      const summaryData = await this.getBudgetSummary(periodName);

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
      console.error('Error fetching totals by period:', error);
      throw error;
    }
  }
}