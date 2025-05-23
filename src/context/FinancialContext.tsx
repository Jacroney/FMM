import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, Budget } from '../services/types';

interface FinancialContextType {
  transactions: Transaction[];
  budgets: Budget[];
  totalBalance: number;
  totalDues: number;
  addTransaction: (transaction: Transaction) => void;
  addBudget: (budget: Budget) => void;
  updateTransaction: (transaction: Transaction) => void;
  updateBudget: (budget: Budget) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalDues, setTotalDues] = useState(0);

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

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [...prev, transaction]);
  };

  const addBudget = (budget: Budget) => {
    setBudgets(prev => [...prev, budget]);
  };

  const updateTransaction = (transaction: Transaction) => {
    setTransactions(prev => 
      prev.map(tx => tx.id === transaction.id ? transaction : tx)
    );
  };

  const updateBudget = (budget: Budget) => {
    setBudgets(prev => 
      prev.map(b => b.id === budget.id ? budget : b)
    );
  };

  return (
    <FinancialContext.Provider value={{
      transactions,
      budgets,
      totalBalance,
      totalDues,
      addTransaction,
      addBudget,
      updateTransaction,
      updateBudget,
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