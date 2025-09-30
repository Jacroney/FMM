import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Transaction, Budget, Member } from '../services/types';
import { TransactionService } from '../services/transactionService';
import { BudgetService } from '../services/budgetService';
import { MemberService } from '../services/memberService';
import { supabase } from '../services/supabaseClient';
import { useChapter } from './ChapterContext';

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

// DEMO MODE: Mock financial data
const DEMO_MODE = true;

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date().toISOString().split('T')[0],
    description: 'Chapter Dues Collection - Fall 2024',
    amount: 6750,
    type: 'income',
    category: 'Dues',
    paymentMethod: 'Bank Transfer',
    chapter_id: 'demo-chapter-id'
  },
  {
    id: '2',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Formal Event Venue Rental',
    amount: -2500,
    type: 'expense',
    category: 'Events',
    paymentMethod: 'Credit Card',
    chapter_id: 'demo-chapter-id'
  },
  {
    id: '3',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Brotherhood Event - Bowling',
    amount: -450,
    type: 'expense',
    category: 'Social',
    paymentMethod: 'Debit Card',
    chapter_id: 'demo-chapter-id'
  },
  {
    id: '4',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Fundraiser Proceeds',
    amount: 1200,
    type: 'income',
    category: 'Fundraising',
    paymentMethod: 'Cash',
    chapter_id: 'demo-chapter-id'
  }
];

const mockBudgets: Budget[] = [
  {
    id: '1',
    category: 'Events',
    budgeted: 5000,
    spent: 2500,
    period: 'Fall 2024',
    chapter_id: 'demo-chapter-id'
  },
  {
    id: '2',
    category: 'Social',
    budgeted: 2000,
    spent: 450,
    period: 'Fall 2024',
    chapter_id: 'demo-chapter-id'
  },
  {
    id: '3',
    category: 'Recruitment',
    budgeted: 1500,
    spent: 0,
    period: 'Fall 2024',
    chapter_id: 'demo-chapter-id'
  }
];

const mockMembers: Member[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'jsmith@university.edu',
    phone: '(555) 111-2222',
    year: 'Junior',
    major: 'Business',
    position: 'President',
    status: 'Active',
    dues_paid: true,
    dues_amount: 150,
    chapter_id: 'demo-chapter-id'
  },
  {
    id: '2',
    name: 'Mike Johnson',
    email: 'mjohnson@university.edu',
    phone: '(555) 333-4444',
    year: 'Sophomore',
    major: 'Engineering',
    position: 'Vice President',
    status: 'Active',
    dues_paid: true,
    dues_amount: 150,
    chapter_id: 'demo-chapter-id'
  },
  {
    id: '3',
    name: 'David Lee',
    email: 'dlee@university.edu',
    phone: '(555) 555-6666',
    year: 'Senior',
    major: 'Finance',
    position: 'Treasurer',
    status: 'Active',
    dues_paid: true,
    dues_amount: 150,
    chapter_id: 'demo-chapter-id'
  },
  {
    id: '4',
    name: 'Chris Williams',
    email: 'cwilliams@university.edu',
    phone: '(555) 777-8888',
    year: 'Freshman',
    major: 'Computer Science',
    position: 'Member',
    status: 'Active',
    dues_paid: false,
    dues_amount: 150,
    chapter_id: 'demo-chapter-id'
  }
];

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentChapter } = useChapter();
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_MODE ? mockTransactions : []);
  const [budgets, setBudgets] = useState<Budget[]>(DEMO_MODE ? mockBudgets : []);
  const [members, setMembers] = useState<Member[]>(DEMO_MODE ? mockMembers : []);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalDues, setTotalDues] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data from Supabase and set up real-time listeners
  useEffect(() => {
    if (!DEMO_MODE && currentChapter?.id) {
      loadInitialData();
      setupRealtimeListeners();
    } else if (DEMO_MODE) {
      // Calculate totals for demo mode
      const balance = mockTransactions.reduce((sum, t) => sum + t.amount, 0);
      setTotalBalance(balance);
      const dues = mockMembers.filter(m => !m.dues_paid).reduce((sum, m) => sum + (m.dues_amount || 0), 0);
      setTotalDues(dues);
    }
    return () => cleanupRealtimeListeners();
  }, [currentChapter?.id]);

  const loadInitialData = async () => {
    if (!currentChapter?.id) {
      setTransactions([]);
      setBudgets([]);
      setMembers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [txData, budgetData, memberData] = await Promise.all([
        TransactionService.fetchTransactions(currentChapter.id).catch(() => []),
        BudgetService.fetchBudgets(currentChapter.id).catch(() => []),
        MemberService.getMembers(currentChapter.id).catch(() => [])
      ]);

      setTransactions(txData);
      setBudgets(budgetData);
      setMembers(memberData);
    } catch (err) {
      // This should rarely happen now since individual services handle their own errors
      console.warn('Unexpected error in loadInitialData:', err);
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
    if (!currentChapter?.id) {
      toast.error('Please select a chapter first');
      throw new Error('No chapter selected');
    }

    try {
      const txWithChapter = { ...transaction, chapter_id: currentChapter.id };
      const newTransaction = await TransactionService.addTransaction(txWithChapter);
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
    if (!currentChapter?.id) {
      toast.error('Please select a chapter first');
      throw new Error('No chapter selected');
    }

    try {
      const txsWithChapter = newTransactions.map(tx => ({ ...tx, chapter_id: currentChapter.id }));
      const addedTransactions = await TransactionService.addTransactions(txsWithChapter);
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
    if (!currentChapter?.id) {
      toast.error('Please select a chapter first');
      throw new Error('No chapter selected');
    }

    try {
      const budgetWithChapter = { ...budget, chapter_id: currentChapter.id };
      const newBudget = await BudgetService.addBudget(budgetWithChapter);
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
    if (!currentChapter?.id) {
      toast.error('Please select a chapter first');
      throw new Error('No chapter selected');
    }

    try {
      const memberWithChapter = { ...member, chapter_id: currentChapter.id };
      const newMember = await MemberService.addMember(memberWithChapter);
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
    if (!currentChapter?.id) return;

    // Listen to transactions for this chapter
    const transactionChannel = supabase
      .channel(`transactions-changes-${currentChapter.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `chapter_id=eq.${currentChapter.id}`
      },
        async () => {
          try {
            const updatedTransactions = await TransactionService.fetchTransactions(currentChapter.id);
            setTransactions(updatedTransactions);
          } catch (err) {
            console.warn('Error refetching transactions:', err);
          }
        }
      )
      .subscribe();

    // Listen to budgets for this chapter
    const budgetChannel = supabase
      .channel(`budgets-changes-${currentChapter.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `chapter_id=eq.${currentChapter.id}`
      },
        async () => {
          try {
            const updatedBudgets = await BudgetService.fetchBudgets(currentChapter.id);
            setBudgets(updatedBudgets);
          } catch (err) {
            console.warn('Budget table not available for realtime updates:', err);
          }
        }
      )
      .subscribe();

    // Listen to members for this chapter
    const memberChannel = supabase
      .channel(`members-changes-${currentChapter.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'members',
        filter: `chapter_id=eq.${currentChapter.id}`
      },
        async () => {
          try {
            const updatedMembers = await MemberService.getMembers(currentChapter.id);
            setMembers(updatedMembers);
          } catch (err) {
            console.warn('Error refetching members:', err);
          }
        }
      )
      .subscribe();

    // Store channels for cleanup
    (window as any).supabaseChannels = { transactionChannel, budgetChannel, memberChannel };
  }, [currentChapter?.id]);

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