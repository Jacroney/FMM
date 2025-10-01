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
import { ExpenseDetail } from '../services/types';
import { ExpenseService } from '../services/expenseService';
import toast from 'react-hot-toast';

interface ExpenseListProps {
  expenses: ExpenseDetail[];
  onExpenseUpdated?: () => void;
  onExpenseDeleted?: () => void;
  showCategoryColumn?: boolean;
  showPeriodColumn?: boolean;
  showActions?: boolean;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onExpenseUpdated,
  onExpenseDeleted,
  showCategoryColumn = true,
  showPeriodColumn = true,
  showActions = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ExpenseDetail>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">{totals.count} expenses</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <p className="text-xs text-blue-600 dark:text-blue-400">Total</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-300">{formatCurrency(totals.total)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <p className="text-xs text-green-600 dark:text-green-400">Completed</p>
            <p className="text-lg font-bold text-green-900 dark:text-green-300">{formatCurrency(totals.completed)}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Pending</p>
            <p className="text-lg font-bold text-yellow-900 dark:text-yellow-300">{formatCurrency(totals.pending)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
            <p className="text-xs text-gray-600 dark:text-gray-400">Count</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{totals.count}</p>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('transaction_date')}
                >
                  Date {getSortIcon('transaction_date')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('description')}
                >
                  Description {getSortIcon('description')}
                </th>
                {showCategoryColumn && (
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('category_name')}
                  >
                    Category {getSortIcon('category_name')}
                  </th>
                )}
                {showPeriodColumn && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Period
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Vendor
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('amount')}
                >
                  Amount {getSortIcon('amount')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                {showActions && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
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
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
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
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
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
                                setEditingExpense(expense.id);
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
                      <tr className="bg-gray-50 dark:bg-gray-750">
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
                    onClick={() => setEditingExpense(expense.id)}
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

      {/* TODO: Add ExpenseModal for editing when editingExpense is set */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Expense</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Edit functionality coming next...
            </p>
            <button
              onClick={() => setEditingExpense(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
