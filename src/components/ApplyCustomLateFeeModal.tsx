import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, AlertTriangle, Check, Users } from 'lucide-react';
import { DuesService } from '../services/duesService';
import { MemberDuesSummary } from '../services/types';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

interface ApplyCustomLateFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  memberDues: MemberDuesSummary[];
  onSuccess?: () => void;
}

interface PreviewMember {
  id: string;
  email: string;
  member_name: string;
  current_balance: number;
  status: string;
}

const ApplyCustomLateFeeModal: React.FC<ApplyCustomLateFeeModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  memberDues,
  onSuccess
}) => {
  const [lateFeeAmount, setLateFeeAmount] = useState('25');
  const [selectedBalances, setSelectedBalances] = useState<number[]>([]);
  const [excludePartial, setExcludePartial] = useState(true);
  const [previewMembers, setPreviewMembers] = useState<PreviewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // Get unique balance amounts from unpaid dues (excluding those with late fees already)
  const availableBalances = useMemo(() => {
    const balances = memberDues
      .filter(d => d.status !== 'paid' && d.status !== 'waived' && d.late_fee === 0)
      .filter(d => !excludePartial || d.status !== 'partial')
      .map(d => d.balance)
      .filter(b => b > 0);

    // Get unique values and sort
    return [...new Set(balances)].sort((a, b) => a - b);
  }, [memberDues, excludePartial]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLateFeeAmount('25');
      setSelectedBalances([]);
      setPreviewMembers([]);
      setExcludePartial(true);
    }
  }, [isOpen]);

  // Load preview when selection changes
  useEffect(() => {
    if (isOpen && selectedBalances.length > 0) {
      loadPreview();
    } else {
      setPreviewMembers([]);
    }
  }, [isOpen, selectedBalances, excludePartial]);

  const loadPreview = async () => {
    if (selectedBalances.length === 0) return;

    setPreviewing(true);
    try {
      const preview = await DuesService.previewCustomLateFee(
        chapterId,
        selectedBalances,
        excludePartial
      );
      setPreviewMembers(preview);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Failed to load preview');
    } finally {
      setPreviewing(false);
    }
  };

  const handleBalanceToggle = (balance: number) => {
    if (selectedBalances.includes(balance)) {
      setSelectedBalances(selectedBalances.filter(b => b !== balance));
    } else {
      setSelectedBalances([...selectedBalances, balance].sort((a, b) => a - b));
    }
  };

  const handleSelectAll = () => {
    if (selectedBalances.length === availableBalances.length) {
      setSelectedBalances([]);
    } else {
      setSelectedBalances([...availableBalances]);
    }
  };

  const handleApply = async () => {
    const amount = parseFloat(lateFeeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid late fee amount');
      return;
    }

    if (amount > 500) {
      toast.error('Late fee cannot exceed $500');
      return;
    }

    if (selectedBalances.length === 0) {
      toast.error('Please select at least one balance amount');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to apply a ${formatCurrency(amount)} late fee to ${previewMembers.length} member(s)?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await DuesService.applyCustomLateFee(
        chapterId,
        amount,
        selectedBalances,
        excludePartial
      );

      if (result.success) {
        toast.success(`Applied ${formatCurrency(amount)} late fee to ${result.applied} member(s)`);
        onSuccess?.();
        onClose();
      } else {
        toast.error('Failed to apply late fees');
      }
    } catch (error) {
      console.error('Error applying late fees:', error);
      toast.error('Failed to apply late fees');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalLateFees = previewMembers.length * parseFloat(lateFeeAmount || '0');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6 z-10 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Apply Custom Late Fee
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add late fees to members based on their current balance
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Late Fee Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Late Fee Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                value={lateFeeAmount}
                onChange={(e) => setLateFeeAmount(e.target.value)}
                min="1"
                max="500"
                step="1"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Exclude Partial Toggle */}
          <div className="mb-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  Exclude Partial Payers
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Don't apply late fee to members who have made partial payments
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExcludePartial(!excludePartial)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  excludePartial ? 'bg-amber-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    excludePartial ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Balance Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Balance Amounts
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400"
              >
                {selectedBalances.length === availableBalances.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {availableBalances.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                No eligible members found (all have late fees or are paid)
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableBalances.map(balance => (
                  <button
                    key={balance}
                    type="button"
                    onClick={() => handleBalanceToggle(balance)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      selectedBalances.includes(balance)
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(balance)}
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedBalances.includes(balance)
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {selectedBalances.includes(balance) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {selectedBalances.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview: {previewing ? 'Loading...' : `${previewMembers.length} member(s) affected`}
                </span>
              </div>

              {!previewing && previewMembers.length > 0 && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                      <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">New</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {previewMembers.slice(0, 10).map(member => (
                          <tr key={member.id}>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                              {member.member_name}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">
                              {formatCurrency(member.current_balance)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-amber-600 dark:text-amber-400">
                              {formatCurrency(member.current_balance + parseFloat(lateFeeAmount || '0'))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewMembers.length > 10 && (
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center bg-gray-100 dark:bg-gray-700">
                        ...and {previewMembers.length - 10} more
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Total late fees to apply: {formatCurrency(totalLateFees)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || previewMembers.length === 0}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg
                       hover:bg-amber-700 transition-colors disabled:opacity-50
                       flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Applying...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Apply Late Fee
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyCustomLateFeeModal;
