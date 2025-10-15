import React, { useState } from 'react';
import {
  Edit2,
  Trash2,
  FileText,
  DollarSign,
  Calendar,
  Tag,
  User,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { ExpenseDetail, BudgetCategory, BudgetPeriod } from '../services/types';
import { ExpenseService } from '../services/expenseService';
import ExpenseModal from './ExpenseModal';
import toast from 'react-hot-toast';

interface ExpenseListProps {
  expenses: ExpenseDetail[];
  onExpenseUpdated?: () => void;
  onExpenseDeleted?: () => void;
  showCategoryColumn?: boolean;
  showPeriodColumn?: boolean;
  showActions?: boolean;
  categories?: BudgetCategory[];
  currentPeriod?: BudgetPeriod | null;
  chapterId?: string | null;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onExpenseUpdated,
  onExpenseDeleted,
  showCategoryColumn = true,
  showPeriodColumn = true,
  showActions = true,
  categories = [],
  currentPeriod = null,
  chapterId = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ExpenseDetail>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseDetail | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Formatting helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  // Handle sorting
  const handleSort = (field: keyof ExpenseDetail) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: keyof ExpenseDetail) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4 inline ml-1" /> :
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  // Filter and sort expenses
  const filteredAndSortedExpenses = expenses
    .filter(expense => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        expense.description.toLowerCase().includes(search) ||
        expense.category_name.toLowerCase().includes(search) ||
        expense.vendor?.toLowerCase().includes(search) ||
        expense.amount.toString().includes(search)
      );
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Handle delete
  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Are you sure you want to delete "${description}"?`)) {
      return;
    }

    try {
      await ExpenseService.deleteExpense(id);
      toast.success('Expense deleted successfully');
      onExpenseDeleted?.();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  // Calculate totals
  const totals = {
    count: filteredAndSortedExpenses.length,
    total: filteredAndSortedExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    completed: filteredAndSortedExpenses.filter(e => e.status === 'completed').reduce((sum, exp) => sum + exp.amount, 0),
    pending: filteredAndSortedExpenses.filter(e => e.status === 'pending').reduce((sum, exp) => sum + exp.amount, 0),
  };

  return (
    <div className="space-y-4">
      {/* Search and Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
            />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">{totals.count} expenses</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-900 dark:text-blue-300">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border border-blue-200/50 dark:border-blue-700/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Total</p>
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(totals.total)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border border-green-200/50 dark:border-green-700/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-green-700 dark:text-green-300">Completed</p>
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xl font-bold text-green-900 dark:text-green-100">{formatCurrency(totals.completed)}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-xl border border-yellow-200/50 dark:border-yellow-700/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Pending</p>
              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-xl font-bold text-yellow-900 dark:text-yellow-100">{formatCurrency(totals.pending)}</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-4 rounded-xl border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Count</p>
              <Receipt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{totals.count}</p>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('transaction_date')}
                >
                  <div className="flex items-center gap-1">
                    Date {getSortIcon('transaction_date')}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center gap-1">
                    Description {getSortIcon('description')}
                  </div>
                </th>
                {showCategoryColumn && (
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('category_name')}
                  >
                    <div className="flex items-center gap-1">
                      Category {getSortIcon('category_name')}
                    </div>
                  </th>
                )}
                {showPeriodColumn && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Period
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Vendor
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    Amount {getSortIcon('amount')}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                {showActions && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No expenses found. {searchTerm && 'Try adjusting your search.'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedExpenses.map((expense) => (
                  <React.Fragment key={expense.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === expense.id ? null : expense.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(expense.transaction_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {expense.description}
                      </td>
                      {showCategoryColumn && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 rounded-full font-medium border border-blue-200 dark:border-blue-700">
                            <Tag className="w-3 h-3" />
                            {expense.category_name}
                          </span>
                        </td>
                      )}
                      {showPeriodColumn && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {expense.period_name}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {expense.vendor || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={getStatusBadge(expense.status)}>
                          {expense.status}
                        </span>
                      </td>
                      {showActions && (
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExpense(expense);
                                setShowEditModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit expense"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(expense.id, expense.description);
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete expense"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {/* Expanded Details Row */}
                    {expandedRow === expense.id && (
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Payment Method</p>
                              <p className="font-medium text-gray-900 dark:text-white">{expense.payment_method || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Category Type</p>
                              <p className="font-medium text-gray-900 dark:text-white">{expense.category_type}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Source</p>
                              <p className="font-medium text-gray-900 dark:text-white">{expense.source}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Budget Allocated</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {expense.budget_allocated ? formatCurrency(expense.budget_allocated) : 'No budget'}
                              </p>
                            </div>
                            {expense.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                                <p className="text-gray-900 dark:text-white">{expense.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredAndSortedExpenses.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
            No expenses found. {searchTerm && 'Try adjusting your search.'}
          </div>
        ) : (
          filteredAndSortedExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {expense.description}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {formatDate(expense.transaction_date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {formatCurrency(expense.amount)}
                  </div>
                  <span className={getStatusBadge(expense.status)}>
                    {expense.status}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                  <Tag className="w-3 h-3" />
                  {expense.category_name}
                </span>
                {expense.vendor && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                    <User className="w-3 h-3" />
                    {expense.vendor}
                  </span>
                )}
              </div>
              {showActions && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setEditingExpense(expense);
                      setShowEditModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id, expense.description)}
                    className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Expense Modal */}
      {showEditModal && editingExpense && (
        <ExpenseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingExpense(null);
          }}
          onSubmit={() => {
            setShowEditModal(false);
            setEditingExpense(null);
            onExpenseUpdated?.();
          }}
          categories={categories}
          currentPeriod={currentPeriod}
          chapterId={chapterId}
          existingExpense={editingExpense}
          mode="edit"
        />
      )}
    </div>
  );
};

export default ExpenseList;
