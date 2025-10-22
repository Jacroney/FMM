import { supabase } from './supabaseClient';
import { BudgetSummary, BudgetCategory, BudgetPeriod, BudgetAllocation, Budget, Expense } from './types';
import { isDemoModeEnabled } from '../utils/env';
import { demoStore, demoHelpers } from '../demo/demoStore';

export class BudgetService {
  static async fetchBudgets(chapterId: string) {
    if (isDemoModeEnabled()) {
      const { budgets } = demoStore.getState();
      return budgets.filter(budget => budget.chapter_id === chapterId).map(budget => ({
        ...budget,
        startDate: new Date(budget.startDate),
        endDate: new Date(budget.endDate)
      }));
    }

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

  static async addBudget(budget: Omit<BudgetAllocation, 'id'>) {
    if (isDemoModeEnabled()) {
      const newBudget: Budget = {
        id: demoHelpers.nextId(),
        chapter_id: budget.chapter_id,
        name: 'Budget allocation',
        amount: budget.allocated,
        spent: 0,
        category: 'Custom',
        period: 'YEARLY',
        startDate: new Date(),
        endDate: new Date()
      };
      demoStore.updateBudgets(budgets => [newBudget, ...budgets]);
      return newBudget;
    }

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

  static async updateBudget(id: string, updates: Partial<Omit<BudgetAllocation, 'id'>>) {
    if (isDemoModeEnabled()) {
      let updated: Budget | null = null;
      demoStore.updateBudgets(budgets =>
        budgets.map(budget => {
          if (budget.id !== id) return budget;
          updated = {
            ...budget,
            amount: updates.allocated ?? budget.amount
          };
          return updated;
        })
      );
      if (!updated) {
        throw new Error('Budget not found');
      }
      return updated;
    }

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
    if (isDemoModeEnabled()) {
      demoStore.updateBudgets(budgets => budgets.filter(budget => budget.id !== id));
      return;
    }

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
    if (isDemoModeEnabled()) {
      const { budgetSummary } = demoStore.getState();
      return budgetSummary.filter(summary => summary.chapter_id === chapterId && (!periodName || summary.period === periodName));
    }

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
    if (isDemoModeEnabled()) {
      const { budgetCategories } = demoStore.getState();
      return budgetCategories.filter(cat => cat.chapter_id === chapterId);
    }

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
    if (isDemoModeEnabled()) {
      const { budgetPeriods } = demoStore.getState();
      return budgetPeriods.filter(period => period.chapter_id === chapterId);
    }

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
    if (isDemoModeEnabled()) {
      const { budgetPeriods } = demoStore.getState();
      return budgetPeriods.find(period => period.chapter_id === chapterId && period.is_current) || null;
    }

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
    if (isDemoModeEnabled()) {
      let found = false;
      demoStore.updateBudgets(budgets =>
        budgets.map(budget => {
          if (budget.category === categoryId && budget.period === periodId) {
            found = true;
            return { ...budget, amount };
          }
          return budget;
        })
      );
      if (!found) {
        demoStore.updateBudgets(budgets => [
          {
            id: demoHelpers.nextId(),
            chapter_id: chapterId,
            name: 'Allocation',
            amount,
            spent: 0,
            category: categoryId,
            period: 'YEARLY',
            startDate: new Date(),
            endDate: new Date()
          },
          ...budgets
        ]);
      }
      return {
        chapter_id: chapterId,
        category_id: categoryId,
        period_id: periodId,
        allocated: amount,
        notes: notes || null
      };
    }

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
    if (isDemoModeEnabled()) {
      demoStore.setState({
        expenses: [
          {
            ...(expense as ExpenseDetail),
            id: demoHelpers.nextId(),
            chapter_id: chapterId,
            category_name: 'Misc',
            category_type: 'Operational Costs',
            period_name: 'FY25 – Spring',
            period_type: 'Semester',
            fiscal_year: 2025,
            budget_allocated: expense.amount * 2
          },
          ...demoStore.getState().expenses
        ]
      });
      return {
        ...expense,
        id: demoHelpers.nextId()
      } as Expense;
    }

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
    if (isDemoModeEnabled()) {
      const { expenses } = demoStore.getState();
      return expenses.filter(expense =>
        expense.chapter_id === chapterId &&
        expense.category_id === categoryId &&
        (!periodId || expense.period_id === periodId)
      );
    }

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
    if (isDemoModeEnabled()) {
      demoStore.setState({
        expenses: demoStore.getState().expenses.filter(expense => expense.id !== id)
      });
      return true;
    }

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
    if (isDemoModeEnabled()) {
      const { budgets } = demoStore.getState();
      return budgets.filter(budget => budget.chapter_id === chapterId && budget.period === periodId);
    }

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
    if (isDemoModeEnabled()) {
      const summaryData = await this.getBudgetSummary(chapterId, periodName);
      const totals = {
        'Fixed Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Operational Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Event Costs': { allocated: 0, spent: 0, remaining: 0 },
        'Grand Total': { allocated: 0, spent: 0, remaining: 0 }
      };
      summaryData.forEach(item => {
        if (item.category_type in totals) {
          totals[item.category_type as 'Fixed Costs' | 'Operational Costs' | 'Event Costs'].allocated += item.allocated;
          totals[item.category_type as 'Fixed Costs' | 'Operational Costs' | 'Event Costs'].spent += item.spent;
          totals[item.category_type as 'Fixed Costs' | 'Operational Costs' | 'Event Costs'].remaining += item.remaining;
        }
        totals['Grand Total'].allocated += item.allocated;
        totals['Grand Total'].spent += item.spent;
        totals['Grand Total'].remaining += item.remaining;
      });
      return totals;
    }

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
