import { Budget, Transaction } from './types';

export class BudgetService {
  static calculateBudgetStatus(budget: Budget, transactions: Transaction[]): Budget {
    const relevantTransactions = transactions.filter(tx => 
      tx.date >= budget.startDate && 
      tx.date <= budget.endDate &&
      tx.category === budget.category
    );

    const spent = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      ...budget,
      spent
    };
  }

  static createBudget(
    name: string,
    amount: number,
    category: string,
    period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    startDate: Date
  ): Budget {
    const endDate = new Date(startDate);
    
    switch (period) {
      case 'MONTHLY':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'YEARLY':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    return {
      id: crypto.randomUUID(),
      name,
      amount,
      spent: 0,
      category,
      period,
      startDate,
      endDate
    };
  }

  static getBudgetProgress(budget: Budget): {
    percentage: number;
    remaining: number;
    isOverBudget: boolean;
  } {
    const percentage = (budget.spent / budget.amount) * 100;
    const remaining = budget.amount - budget.spent;
    const isOverBudget = budget.spent > budget.amount;

    return {
      percentage: Math.min(percentage, 100),
      remaining: Math.max(remaining, 0),
      isOverBudget
    };
  }
} 