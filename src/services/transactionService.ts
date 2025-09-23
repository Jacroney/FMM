import { supabase } from './supabaseClient';
import { Transaction } from './types';

export class TransactionService {
  // Fetch all transactions for a specific chapter
  static async fetchTransactions(chapterId: string): Promise<Transaction[]> {
    if (!chapterId) {
      console.error('Chapter ID is required for fetchTransactions');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('date', { ascending: false });

      if (error) throw error;

      // Convert database format to app format
      return (data || []).map(tx => ({
        id: tx.id,
        chapter_id: tx.chapter_id,
        date: new Date(tx.date),
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        source: tx.source,
        status: tx.status
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // Fetch transactions by date range for a specific chapter
  static async fetchTransactionsByDateRange(chapterId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    if (!chapterId) {
      console.error('Chapter ID is required for fetchTransactionsByDateRange');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('chapter_id', chapterId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(tx => ({
        id: tx.id,
        chapter_id: tx.chapter_id,
        date: new Date(tx.date),
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        source: tx.source,
        status: tx.status
      }));
    } catch (error) {
      console.error('Error fetching transactions by date range:', error);
      throw error;
    }
  }

  // Add a single transaction
  static async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          chapter_id: transaction.chapter_id,
          date: transaction.date.toISOString(),
          amount: transaction.amount,
          description: transaction.description,
          category: transaction.category,
          source: transaction.source,
          status: transaction.status
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        date: new Date(data.date),
        amount: data.amount,
        description: data.description,
        category: data.category,
        source: data.source,
        status: data.status
      };
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  // Add multiple transactions (batch insert)
  static async addTransactions(transactions: Omit<Transaction, 'id'>[]): Promise<Transaction[]> {
    try {
      const transactionsToInsert = transactions.map(tx => ({
        chapter_id: tx.chapter_id,
        date: tx.date.toISOString(),
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        source: tx.source,
        status: tx.status
      }));

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select();

      if (error) throw error;

      return (data || []).map(tx => ({
        id: tx.id,
        date: new Date(tx.date),
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        source: tx.source,
        status: tx.status
      }));
    } catch (error) {
      console.error('Error adding multiple transactions:', error);
      throw error;
    }
  }

  // Update a transaction
  static async updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
    try {
      const updateData: any = {};
      
      if (updates.date) updateData.date = updates.date.toISOString();
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.description) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.source) updateData.source = updates.source;
      if (updates.status) updateData.status = updates.status;

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        date: new Date(data.date),
        amount: data.amount,
        description: data.description,
        category: data.category,
        source: data.source,
        status: data.status
      };
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  // Delete a transaction
  static async deleteTransaction(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Delete multiple transactions
  static async deleteTransactions(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting transactions:', error);
      throw error;
    }
  }

  // Get transactions by category
  static async getTransactionsByCategory(chapterId: string, category: string): Promise<Transaction[]> {
    if (!chapterId) {
      console.error('Chapter ID is required for getTransactionsByCategory');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('category', category)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(tx => ({
        id: tx.id,
        date: new Date(tx.date),
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        source: tx.source,
        status: tx.status
      }));
    } catch (error) {
      console.error('Error fetching transactions by category:', error);
      throw error;
    }
  }

  // Get transaction statistics
  static async getTransactionStats(chapterId: string): Promise<{
    total: number;
    totalAmount: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    if (!chapterId) {
      console.error('Chapter ID is required for getTransactionStats');
      return { total: 0, totalAmount: 0, byCategory: {}, bySource: {} };
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('chapter_id', chapterId);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        totalAmount: 0,
        byCategory: {} as Record<string, number>,
        bySource: {} as Record<string, number>
      };

      data?.forEach(tx => {
        stats.totalAmount += tx.amount;
        
        if (!stats.byCategory[tx.category]) {
          stats.byCategory[tx.category] = 0;
        }
        stats.byCategory[tx.category] += tx.amount;

        if (!stats.bySource[tx.source]) {
          stats.bySource[tx.source] = 0;
        }
        stats.bySource[tx.source] += tx.amount;
      });

      return stats;
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      throw error;
    }
  }
}