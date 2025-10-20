import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import CircularProgress from './CircularProgress';
import { BudgetSummary } from '../services/types';

interface BudgetCardProps {
  budget: BudgetSummary;
  onClick?: () => void;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget, onClick }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusInfo = () => {
    if (budget.percent_used > 100) {
      return {
        label: 'Over Budget',
        color: 'red',
        icon: AlertCircle,
        bgClass: 'bg-red-50 dark:bg-red-900/20',
        borderClass: 'border-gray-200 dark:border-gray-700',
        textClass: 'text-red-700 dark:text-red-300'
      };
    }
    if (budget.percent_used > 80) {
      return {
        label: 'Warning',
        color: 'yellow',
        icon: AlertCircle,
        bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderClass: 'border-gray-200 dark:border-gray-700',
        textClass: 'text-yellow-700 dark:text-yellow-300'
      };
    }
    return {
      label: 'On Track',
      color: 'green',
      icon: CheckCircle,
      bgClass: 'bg-green-50 dark:bg-green-900/20',
      borderClass: 'border-gray-200 dark:border-gray-700',
      textClass: 'text-green-700 dark:text-green-300'
    };
  };

  const getCategoryIcon = () => {
    switch (budget.category_type) {
      case 'Fixed Costs':
        return '🏠';
      case 'Operational Costs':
        return '⚙️';
      case 'Event Costs':
        return '🎉';
      default:
        return '💰';
    }
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;
  const isOverBudget = budget.remaining < 0;

  return (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden
        bg-white dark:bg-gray-800
        rounded-2xl shadow-sm hover:shadow-md
        border ${status.borderClass}
        transition-all duration-200
        cursor-pointer
        hover:-translate-y-0.5
        ${onClick ? 'active:scale-[0.98]' : ''}
      `}
    >
      <div className="relative p-6">
        {/* Header with category name and status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{getCategoryIcon()}</span>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-1">
                {budget.category}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {budget.category_type}
            </p>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bgClass} ${status.textClass} text-xs font-medium`}>
            <StatusIcon className="w-3 h-3" />
            <span>{status.label}</span>
          </div>
        </div>

        {/* Circular Progress */}
        <div className="flex justify-center my-6">
          <CircularProgress
            percentage={budget.percent_used}
            size={140}
            strokeWidth={12}
            showPercentage={true}
          />
        </div>

        {/* Budget amounts */}
        <div className="space-y-3">
          {/* Allocated */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Allocated</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatCurrency(budget.allocated)}
            </span>
          </div>

          {/* Spent */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Spent</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatCurrency(budget.spent)}
            </span>
          </div>

          {/* Remaining - with color coding */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Remaining
              </span>
              {isOverBudget ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-green-500" />
              )}
            </div>
            <span className={`text-base font-bold ${
              isOverBudget
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {formatCurrency(Math.abs(budget.remaining))}
              {isOverBudget && ' over'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetCard;
