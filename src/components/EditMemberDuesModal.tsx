import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText, Save } from 'lucide-react';
import { DuesService } from '../services/duesService';
import { MemberDuesSummary } from '../services/types';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

interface EditMemberDuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberDues: MemberDuesSummary;
  onSuccess?: () => void;
}

const EditMemberDuesModal: React.FC<EditMemberDuesModalProps> = ({
  isOpen,
  onClose,
  memberDues,
  onSuccess
}) => {
  const [baseAmount, setBaseAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Initialize form with current values
  useEffect(() => {
    if (isOpen && memberDues) {
      setBaseAmount(memberDues.base_amount.toString());
      setDueDate(memberDues.due_date || '');
      setAdjustment(memberDues.adjustments?.toString() || '0');
      setAdjustmentReason(memberDues.adjustment_reason || '');
      setNotes(memberDues.notes || '');
      setStatus(memberDues.status);
    }
  }, [isOpen, memberDues]);

  // Calculate new totals based on form values
  const calculateTotals = () => {
    const base = parseFloat(baseAmount) || 0;
    const lateFee = memberDues.late_fee || 0;
    const adj = parseFloat(adjustment) || 0;
    const newTotal = base + lateFee + adj;
    const newBalance = newTotal - memberDues.amount_paid;
    return { newTotal, newBalance };
  };

  const { newTotal, newBalance } = calculateTotals();

  const handleSave = async () => {
    const base = parseFloat(baseAmount);
    if (isNaN(base) || base < 0) {
      toast.error('Please enter a valid base amount');
      return;
    }

    const adj = parseFloat(adjustment) || 0;
    if (adj !== 0 && !adjustmentReason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    setLoading(true);
    try {
      const lateFee = memberDues.late_fee || 0;
      const total = base + lateFee + adj;
      const balance = total - memberDues.amount_paid;

      // Determine status based on balance
      let newStatus = status;
      if (status === 'waived') {
        // Keep waived status
      } else if (balance <= 0) {
        newStatus = 'paid';
      } else if (memberDues.amount_paid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'pending';
      }

      await DuesService.updateMemberDues(memberDues.id, {
        base_amount: base,
        adjustments: adj,
        total_amount: total,
        balance: Math.max(balance, 0),
        due_date: dueDate || null,
        adjustment_reason: adj !== 0 ? adjustmentReason : null,
        notes: notes || null,
        status: newStatus as 'pending' | 'partial' | 'paid' | 'overdue' | 'waived',
        paid_date: balance <= 0 && !memberDues.paid_date ? new Date().toISOString().split('T')[0] : memberDues.paid_date
      });

      toast.success('Dues updated successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating dues:', error);
      toast.error('Failed to update dues');
    } finally {
      setLoading(false);
    }
  };

  const handleWaive = async () => {
    if (!confirm(`Are you sure you want to waive dues for ${memberDues.member_name}? This will set their balance to $0.`)) {
      return;
    }

    setLoading(true);
    try {
      await DuesService.updateMemberDues(memberDues.id, {
        status: 'waived',
        balance: 0,
        notes: notes ? `${notes}\n[Dues waived]` : '[Dues waived]'
      });

      toast.success('Dues waived successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error waiving dues:', error);
      toast.error('Failed to waive dues');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Dues
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {memberDues.member_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Current Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Current Total:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formatCurrency(memberDues.total_amount)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Amount Paid:</span>
                <span className="ml-2 font-medium text-green-600">
                  {formatCurrency(memberDues.amount_paid)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Late Fee:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formatCurrency(memberDues.late_fee)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Current Balance:</span>
                <span className={`ml-2 font-medium ${memberDues.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(memberDues.balance)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Base Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Base Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Adjustment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adjustment (+ or -)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  step="0.01"
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use negative values to reduce dues (e.g., -50 for $50 discount)
              </p>
            </div>

            {/* Adjustment Reason */}
            {parseFloat(adjustment) !== 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adjustment Reason *
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., Scholarship, Payment plan discount"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Add any notes..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* New Totals Preview */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              After Changes:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-blue-600 dark:text-blue-300">New Total:</span>
                <span className="ml-2 font-semibold text-blue-800 dark:text-blue-200">
                  {formatCurrency(newTotal)}
                </span>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-300">New Balance:</span>
                <span className={`ml-2 font-semibold ${newBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.max(newBalance, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleWaive}
              disabled={loading || memberDues.status === 'waived'}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors disabled:opacity-50 text-sm"
            >
              Waive Dues
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 transition-colors disabled:opacity-50
                       flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditMemberDuesModal;
