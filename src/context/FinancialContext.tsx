import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Transaction, Budget, Member } from '../services/types';
import { TransactionService } from '../services/transactionService';
import { BudgetService } from '../services/budgetService';
import { MemberService } from '../services/memberService';
import { supabase } from '../services/supabaseClient';

interface FinancialContextType {
  transactions: Transaction[];
  budgets: Budget[];
  members: Member[];
  totalBalance: number;
  totalDues: number;
  isLoading: boolean;
  error: string | null;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  addTransactions: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (id: string, updates: Partial<Omit<Budget, 'id'>>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addMember: (member: Omit<Member, 'id'>) => Promise<void>;
  updateMember: (id: string, updates: Partial<Omit<Member, 'id'>>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalDues, setTotalDues] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data from Supabase and set up real-time listeners
  useEffect(() => {
    loadInitialData();
    setupRealtimeListeners();
    return () => cleanupRealtimeListeners();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    console.log('🔄 Connecting to Supabase...');
    
    try {
      const [txData, budgetData, memberData] = await Promise.all([
        TransactionService.fetchTransactions(),
        BudgetService.fetchBudgets(),
        MemberService.getMembers()
      ]);
      
      setTransactions(txData);
      setBudgets(budgetData);
      setMembers(memberData);
      
      console.log('✅ Successfully connected to Supabase!');
      console.log(`📊 Loaded ${txData.length} transactions`);
      console.log(`📈 Loaded ${budgetData.length} budgets`);
      console.log(`👥 Loaded ${memberData.length} members`);
      
      // Log sample data to verify structure
      if (txData.length > 0) {
        console.log('Sample transaction:', txData[0]);
      }
      if (budgetData.length > 0) {
        console.log('Sample budget:', budgetData[0]);
      }
      if (memberData.length > 0) {
        console.log('Sample member:', memberData[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('❌ Error connecting to Supabase:', err);
      console.error('Make sure you have updated your .env file with correct Supabase credentials');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals when data changes
  useEffect(() => {
    // Calculate total balance from transactions
    const balance = transactions.reduce((sum, tx) => {
      return sum + (tx.source === 'CHASE' ? tx.amount : -tx.amount);
    }, 0);
    setTotalBalance(balance);

    // Calculate total dues (sum of all budget amounts)
    const dues = budgets.reduce((sum, budget) => sum + budget.amount, 0);
    setTotalDues(dues);
  }, [transactions, budgets]);

  // Transaction operations
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const newTransaction = await TransactionService.addTransaction(transaction);
      setTransactions(prev => [...prev, newTransaction]);
      toast.success('Transaction added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add transaction';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const addTransactions = async (newTransactions: Omit<Transaction, 'id'>[]) => {
    try {
      const addedTransactions = await TransactionService.addTransactions(newTransactions);
      setTransactions(prev => [...prev, ...addedTransactions]);
      toast.success(`${addedTransactions.length} transactions added successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add transactions';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
    try {
      const updatedTransaction = await TransactionService.updateTransaction(id, updates);
      setTransactions(prev => 
        prev.map(tx => tx.id === id ? updatedTransaction : tx)
      );
      toast.success('Transaction updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await TransactionService.deleteTransaction(id);
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      toast.success('Transaction deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Budget operations
  const addBudget = async (budget: Omit<Budget, 'id'>) => {
    try {
      const newBudget = await BudgetService.addBudget(budget);
      setBudgets(prev => [...prev, newBudget]);
      toast.success('Budget added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add budget';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateBudget = async (id: string, updates: Partial<Omit<Budget, 'id'>>) => {
    try {
      const updatedBudget = await BudgetService.updateBudget(id, updates);
      setBudgets(prev => 
        prev.map(b => b.id === id ? updatedBudget : b)
      );
      toast.success('Budget updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update budget';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await BudgetService.deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      toast.success('Budget deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete budget';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Member operations
  const addMember = async (member: Omit<Member, 'id'>) => {
    try {
      const newMember = await MemberService.addMember(member);
      setMembers(prev => [...prev, newMember]);
      toast.success('Member added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add member';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateMember = async (id: string, updates: Partial<Omit<Member, 'id'>>) => {
    try {
      const updatedMember = await MemberService.updateMember(id, updates);
      setMembers(prev => 
        prev.map(m => m.id === id ? updatedMember : m)
      );
      toast.success('Member updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update member';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteMember = async (id: string) => {
    try {
      await MemberService.deleteMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success('Member deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete member';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const refreshData = async () => {
    await loadInitialData();
  };

  // Real-time listeners
  const setupRealtimeListeners = useCallback(() => {
    // Listen to transactions
    const transactionChannel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, 
        async (payload) => {
          console.log('Transaction change detected:', payload);
          // Refetch transactions to keep data in sync
          try {
            const updatedTransactions = await TransactionService.fetchTransactions();
            setTransactions(updatedTransactions);
          } catch (err) {
            console.error('Error refetching transactions:', err);
          }
        }
      )
      .subscribe();

    // Listen to budgets
    const budgetChannel = supabase
      .channel('budgets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, 
        async (payload) => {
          console.log('Budget change detected:', payload);
          try {
            const updatedBudgets = await BudgetService.fetchBudgets();
            setBudgets(updatedBudgets);
          } catch (err) {
            console.error('Error refetching budgets:', err);
          }
        }
      )
      .subscribe();

    // Listen to members
    const memberChannel = supabase
      .channel('members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, 
        async (payload) => {
          console.log('Member change detected:', payload);
          try {
            const updatedMembers = await MemberService.getMembers();
            setMembers(updatedMembers);
          } catch (err) {
            console.error('Error refetching members:', err);
          }
        }
      )
      .subscribe();

    // Store channels for cleanup
    (window as any).supabaseChannels = { transactionChannel, budgetChannel, memberChannel };
  }, []);

  const cleanupRealtimeListeners = useCallback(() => {
    const channels = (window as any).supabaseChannels;
    if (channels) {
      channels.transactionChannel?.unsubscribe();
      channels.budgetChannel?.unsubscribe();
      channels.memberChannel?.unsubscribe();
      delete (window as any).supabaseChannels;
    }
  }, []);

  return (
    <FinancialContext.Provider value={{
      transactions,
      budgets,
      members,
      totalBalance,
      totalDues,
      isLoading,
      error,
      addTransaction,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addMember,
      updateMember,
      deleteMember,
      refreshData
    }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
}; 