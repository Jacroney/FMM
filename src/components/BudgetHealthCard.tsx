import React from 'react';
import { useFinancial } from '../context/FinancialContext';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const BudgetHealthCard: React.FC = () => {
  const { budgets, transactions } = useFinancial();

  // Calculate total budget allocated
  const totalBudgetAllocated = budgets.reduce((sum, budget) => sum + budget.amount, 0);

  // Calculate total spent across all budget categories
  const totalSpent = budgets.reduce((sum, budget) => {
    const budgetTransactions = transactions.filter(tx => tx.budget_id === budget.id);
    const spent = budgetTransactions.reduce((txSum, tx) => txSum + Math.abs(tx.amount), 0);
    return sum + spent;
  }, 0);

  // Calculate percentage used
  const percentageUsed = totalBudgetAllocated > 0 ? (totalSpent / totalBudgetAllocated) * 100 : 0;

  // Determine status and color
  const getStatusInfo = () => {
    if (percentageUsed < 75) {
      return {
        status: 'On track',
        color: 'emerald',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-600',
        darkBgColor: 'dark:bg-emerald-900/20',
        darkTextColor: 'dark:text-emerald-400',
        progressColor: 'bg-emerald-500',
        icon: (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        ),
      };
    } else if (percentageUsed < 90) {
      return {
        status: 'Monitor closely',
        color: 'amber',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        darkBgColor: 'dark:bg-amber-900/20',
        darkTextColor: 'dark:text-amber-400',
        progressColor: 'bg-amber-500',
        icon: (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        ),
      };
    } else {
      return {
        status: 'Over budget',
        color: 'red',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        darkBgColor: 'dark:bg-red-900/20',
        darkTextColor: 'dark:text-red-400',
        progressColor: 'bg-red-500',
        icon: (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        ),
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          Budget Health
        </h2>
        <div className={`w-10 h-10 rounded-lg ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.darkBgColor} ${statusInfo.darkTextColor} flex items-center justify-center`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {statusInfo.icon}
          </svg>
        </div>
      </div>

      {/* Percentage Display */}
      <div className="mb-3">
        <p className={`text-3xl lg:text-4xl font-bold ${statusInfo.textColor} ${statusInfo.darkTextColor}`}>
          {percentageUsed.toFixed(1)}%
        </p>
        <p className="text-sm text-gray-900 dark:text-white font-medium mt-1">
          {statusInfo.status}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 ${statusInfo.progressColor} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Budget Details */}
      <div className="flex justify-between items-center text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Spent</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 dark:text-gray-400">Budget</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(totalBudgetAllocated)}
          </p>
        </div>
      </div>

      {/* Remaining Amount */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Remaining
          </span>
          <span className={`text-sm font-bold ${
            totalBudgetAllocated - totalSpent >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatCurrency(totalBudgetAllocated - totalSpent)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BudgetHealthCard;
