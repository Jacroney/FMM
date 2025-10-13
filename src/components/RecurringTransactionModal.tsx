import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { RecurringTransaction, BudgetCategory, BudgetPeriod } from '../services/types';
import { RecurringService } from '../services/recurringService';
import { ExpenseService } from '../services/expenseService';
import { useChapter } from '../context/ChapterContext';
import toast from 'react-hot-toast';

interface RecurringTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  transaction?: RecurringTransaction | null;
}

const RecurringTransactionModal: React.FC<RecurringTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  transaction,
}) => {
  const { currentChapter } = useChapter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    frequency: 'monthly' as RecurringTransaction['frequency'],
    next_due_date: new Date().toISOString().split('T')[0],
    category_id: '',
    period_id: '',
    payment_method: '',
    auto_post: false,
    is_active: true,
  });

  // Load categories and periods
  useEffect(() => {
    const loadData = async () => {
      if (!currentChapter?.id) return;

      try {
        const [categoriesData, periodsData] = await Promise.all([
          ExpenseService.getCategories(currentChapter.id),
          ExpenseService.getPeriods(currentChapter.id),
        ]);
        setCategories(categoriesData);
        setPeriods(periodsData);

        // Set default period to current period if available
        if (!transaction && periodsData.length > 0) {
          const currentPeriod = periodsData.find(p => p.is_current);
          if (currentPeriod) {
            setFormData(prev => ({ ...prev, period_id: currentPeriod.id }));
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, currentChapter?.id, transaction]);

  // Populate form when editing
  useEffect(() => {
    if (transaction) {
      setFormData({
        name: transaction.name,
        description: transaction.description || '',
        amount: Math.abs(transaction.amount).toString(),
        frequency: transaction.frequency,
        next_due_date: transaction.next_due_date,
        category_id: transaction.category_id || '',
        period_id: transaction.period_id || '',
        payment_method: transaction.payment_method || '',
        auto_post: transaction.auto_post,
        is_active: transaction.is_active,
      });
    } else {
      // Reset form for new transaction
      setFormData({
        name: '',
        description: '',
        amount: '',
        frequency: 'monthly',
        next_due_date: new Date().toISOString().split('T')[0],
        category_id: '',
        period_id: '',
        payment_method: '',
        auto_post: false,
        is_active: true,
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentChapter?.id) {
      toast.error('No chapter selected');
      return;
    }

    if (!formData.name || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Determine if this is an expense (negative) or income (positive)
      // You could add a toggle in the UI, but for now treating as expense if negative checkbox is checked
      const amount = parseFloat(formData.amount);

      const recurringData = {
        chapter_id: currentChapter.id,
        name: formData.name,
        description: formData.description || null,
        amount: amount, // Will be negative for expenses
        frequency: formData.frequency,
        next_due_date: formData.next_due_date,
        category_id: formData.category_id || null,
        period_id: formData.period_id || null,
        payment_method: formData.payment_method || null,
        auto_post: formData.auto_post,
        is_active: formData.is_active,
        created_by: null, // Will be set by RLS
      };

      if (transaction) {
        // Update existing
        await RecurringService.updateRecurringTransaction(transaction.id, recurringData);
        toast.success('Recurring transaction updated successfully');
      } else {
        // Create new
        await RecurringService.createRecurringTransaction(recurringData);
        toast.success('Recurring transaction created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving recurring transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save recurring transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {transaction ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Monthly Rent, Insurance Premium"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={2}
              placeholder="Optional notes about this recurring transaction"
            />
          </div>

          {/* Amount and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use negative for expenses, positive for income
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Frequency <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as RecurringTransaction['frequency'] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {RecurringService.getFrequencyOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Next Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Next Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.next_due_date}
              onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Category and Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Period
              </label>
              <select
                value={formData.period_id}
                onChange={(e) => setFormData({ ...formData, period_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select period</option>
                {periods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({period.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select method</option>
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Credit Card">Credit Card</option>
              <option value="ACH">ACH</option>
              <option value="Venmo">Venmo</option>
              <option value="Zelle">Zelle</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_post}
                onChange={(e) => setFormData({ ...formData, auto_post: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-post transactions (automatically create expense on due date)
              </span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Active
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : transaction ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecurringTransactionModal;
