import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BudgetCategory, BudgetPeriod, Expense, ExpenseDetail } from '../services/types';
import { ExpenseService } from '../services/expenseService';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  categories: BudgetCategory[];
  currentPeriod: BudgetPeriod | null;
  chapterId: string | null;
  existingExpense?: ExpenseDetail | null;
  mode?: 'create' | 'edit';
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  currentPeriod,
  chapterId,
  existingExpense = null,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    vendor: '',
    payment_method: 'Cash' as 'Cash' | 'Check' | 'Credit Card' | 'ACH' | 'Venmo' | 'Other',
    status: 'completed' as 'pending' | 'completed' | 'cancelled',
    notes: ''
  });

  const [budgetInfo, setBudgetInfo] = useState<{ allocated: number; spent: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with existing expense data if editing
  useEffect(() => {
    if (mode === 'edit' && existingExpense) {
      setFormData({
        category_id: existingExpense.category_id,
        amount: existingExpense.amount.toString(),
        description: existingExpense.description,
        transaction_date: existingExpense.transaction_date,
        vendor: existingExpense.vendor || '',
        payment_method: (existingExpense.payment_method || 'Cash') as any,
        status: existingExpense.status,
        notes: existingExpense.notes || ''
      });
    } else if (mode === 'create') {
      // Reset form for new expense
      setFormData({
        category_id: '',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
        vendor: '',
        payment_method: 'Cash',
        status: 'completed',
        notes: ''
      });
    }
  }, [mode, existingExpense, isOpen]);

  useEffect(() => {
    if (formData.category_id && currentPeriod) {
      loadBudgetInfo();
    }
  }, [formData.category_id, currentPeriod, chapterId]);

  const loadBudgetInfo = async () => {
    if (!currentPeriod || !chapterId) return;

    try {
      const summary = await ExpenseService.getBudgetSummary(chapterId, currentPeriod.name);
      const category = categories.find(c => c.id === formData.category_id);
      const budgetItem = summary.find(s => s.category === category?.name);

      if (budgetItem) {
        setBudgetInfo({
          allocated: budgetItem.allocated,
          spent: budgetItem.spent
        });
      }
    } catch (error) {
      console.error('Error loading budget info:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPeriod || !chapterId) {
      alert('No current period selected');
      return;
    }

    setIsSubmitting(true);

    try {
      const expenseData = {
        budget_id: null,
        category_id: formData.category_id,
        period_id: currentPeriod.id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        transaction_date: formData.transaction_date,
        vendor: formData.vendor || null,
        receipt_url: null,
        payment_method: formData.payment_method as any,
        status: formData.status,
        source: 'MANUAL' as const,
        notes: formData.notes || null,
        created_by: null
      };

      if (mode === 'edit' && existingExpense) {
        await ExpenseService.updateExpense(existingExpense.id, expenseData);
      } else {
        await ExpenseService.addExpense(chapterId, expenseData);
      }

      // Call onSubmit callback to refresh data
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'edit' ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700 [&>optgroup]:dark:text-white [&>optgroup]:dark:bg-gray-700"
              required
            >
              <option value="">Select a category</option>
              {['Fixed Costs', 'Operational Costs', 'Event Costs'].map(type => (
                <optgroup key={type} label={type}>
                  {categories
                    .filter(c => c.type === type)
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {budgetInfo && (
            <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                Budget: ${budgetInfo.allocated.toFixed(2)} |
                Spent: ${budgetInfo.spent.toFixed(2)} |
                Remaining: ${(budgetInfo.allocated - budgetInfo.spent).toFixed(2)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              placeholder="What was this expense for?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vendor
            </label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              placeholder="Where was this purchased?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
            >
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Credit Card">Credit Card</option>
              <option value="ACH">ACH</option>
              <option value="Venmo">Venmo</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              placeholder="Additional notes or context..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
