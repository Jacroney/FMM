import React, { useState, useEffect } from 'react';
import { X, Edit2, Plus, Receipt, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import CircularProgress from './CircularProgress';
import { BudgetSummary, ExpenseDetail, BudgetCategory, BudgetPeriod } from '../services/types';
import { ExpenseService } from '../services/expenseService';
import ExpenseModal from './ExpenseModal';
import toast from 'react-hot-toast';

interface BudgetDetailModalProps {
  budget: BudgetSummary;
  isOpen: boolean;
  onClose: () => void;
  onBudgetUpdate: (categoryName: string, newAmount: number) => Promise<void>;
  chapterId: string | null;
  categories: BudgetCategory[];
  currentPeriod: BudgetPeriod | null;
}

const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({
  budget,
  isOpen,
  onClose,
  onBudgetUpdate,
  chapterId,
  categories,
  currentPeriod
}) => {
  const [expenses, setExpenses] = useState<ExpenseDetail[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editValue, setEditValue] = useState(budget.allocated);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  useEffect(() => {
    if (isOpen && chapterId) {
      loadExpenses();
    }
  }, [isOpen, chapterId, budget.category_id]);

  useEffect(() => {
    setEditValue(budget.allocated);
  }, [budget.allocated]);

  const loadExpenses = async () => {
    if (!chapterId) return;

    try {
      setLoadingExpenses(true);
      const allExpenses = await ExpenseService.getExpenses(chapterId, {
        categoryId: budget.category_id,
        periodId: budget.period_id
      });
      setExpenses(allExpenses.slice(0, 10)); // Show last 10 expenses
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleSaveBudget = async () => {
    try {
      await onBudgetUpdate(budget.category, editValue);
      setIsEditingBudget(false);
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    }
  };

  const handleExpenseAdded = () => {
    loadExpenses();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = () => {
    if (budget.percent_used > 100) return 'red';
    if (budget.percent_used > 80) return 'yellow';
    return 'green';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{budget.category_type}</p>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{budget.category}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {budget.period} {budget.fiscal_year}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] custom-scrollbar">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Left: Circular Progress */}
                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-8">
                  <CircularProgress
                    percentage={budget.percent_used}
                    size={200}
                    strokeWidth={16}
                    showPercentage={true}
                    color={getStatusColor() as any}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    Budget Utilization
                  </p>
                </div>

                {/* Right: Budget Details */}
                <div className="space-y-4">
                  {/* Allocated */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Allocated</p>
                          {isEditingBudget ? (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm">$</span>
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(Number(e.target.value))}
                                className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(budget.allocated)}
                            </p>
                          )}
                        </div>
                      </div>
                      {isEditingBudget ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveBudget}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingBudget(false);
                              setEditValue(budget.allocated);
                            }}
                            className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditingBudget(true)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Spent */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Spent</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(budget.spent)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Remaining */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        budget.remaining >= 0
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <TrendingUp className={`w-5 h-5 ${
                          budget.remaining >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {budget.remaining >= 0 ? 'Remaining' : 'Over Budget'}
                        </p>
                        <p className={`text-2xl font-bold ${
                          budget.remaining >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(Math.abs(budget.remaining))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Expenses */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Recent Expenses
                    </h3>
                    <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                      {expenses.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Expense
                  </button>
                </div>

                {loadingExpenses ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading expenses...</p>
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">No expenses yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Add your first expense to this category
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {expense.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(expense.transaction_date)}
                            </p>
                            {expense.vendor && (
                              <>
                                <span className="text-gray-400">•</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {expense.vendor}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(expense.amount)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            expense.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : expense.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {expense.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleExpenseAdded}
        categories={categories}
        currentPeriod={currentPeriod}
        chapterId={chapterId}
        preselectedCategoryId={budget.category_id}
      />
    </>
  );
};

export default BudgetDetailModal;
