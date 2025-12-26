import React, { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, Check } from 'lucide-react';
import { InstallmentService } from '../services/installmentService';
import { MemberDuesSummary, InstallmentEligibility } from '../services/types';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

interface InstallmentEligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberDues: MemberDuesSummary;
  chapterId: string;
  onUpdate?: () => void;
}

const PLAN_OPTIONS = [2, 3, 4];

const InstallmentEligibilityModal: React.FC<InstallmentEligibilityModalProps> = ({
  isOpen,
  onClose,
  memberDues,
  chapterId,
  onUpdate
}) => {
  const [isEligible, setIsEligible] = useState(false);
  const [allowedPlans, setAllowedPlans] = useState<number[]>([2, 3]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (isOpen && memberDues) {
      loadEligibility();
    }
  }, [isOpen, memberDues?.id]);

  const loadEligibility = async () => {
    setInitialLoading(true);
    try {
      const eligibility = await InstallmentService.getEligibility(memberDues.id);
      if (eligibility) {
        setIsEligible(eligibility.is_eligible);
        setAllowedPlans(eligibility.allowed_plans || [2, 3]);
        setNotes(eligibility.notes || '');
      } else {
        // Default values for new eligibility
        setIsEligible(false);
        setAllowedPlans([2, 3]);
        setNotes('');
      }
    } catch (error) {
      console.error('Error loading eligibility:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handlePlanToggle = (plan: number) => {
    if (allowedPlans.includes(plan)) {
      // Don't allow removing if it's the only one
      if (allowedPlans.length > 1) {
        setAllowedPlans(allowedPlans.filter(p => p !== plan));
      }
    } else {
      setAllowedPlans([...allowedPlans, plan].sort((a, b) => a - b));
    }
  };

  const handleSave = async () => {
    if (isEligible && allowedPlans.length === 0) {
      toast.error('Select at least one payment plan option');
      return;
    }

    setLoading(true);
    try {
      const result = await InstallmentService.setEligibility(
        memberDues.id,
        chapterId,
        isEligible,
        allowedPlans,
        notes || undefined
      );

      if (result.success) {
        toast.success(isEligible ? 'Installment payments enabled' : 'Installment payments disabled');
        onUpdate?.();
        onClose();
      } else {
        toast.error(result.error || 'Failed to update eligibility');
      }
    } catch (error) {
      console.error('Error saving eligibility:', error);
      toast.error('Failed to update eligibility');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const installmentAmount = (plan: number) => memberDues.balance / plan;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Installment Settings
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

          {initialLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Dues Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Balance Due:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(memberDues.balance)}
                  </span>
                </div>
              </div>

              {/* Enable Toggle */}
              <div className="mb-6">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Allow Installment Payments
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Member can split dues into multiple payments
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEligible(!isEligible)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEligible ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEligible ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* Plan Options */}
              {isEligible && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Available Payment Plans
                  </label>
                  <div className="space-y-2">
                    {PLAN_OPTIONS.map(plan => (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => handlePlanToggle(plan)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          allowedPlans.includes(plan)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            allowedPlans.includes(plan)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {allowedPlans.includes(plan) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {plan} Payments
                            </span>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatCurrency(installmentAmount(plan))}/month
                            </p>
                          </div>
                        </div>
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this member's eligibility..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Info Box */}
              {isEligible && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6">
                  <div className="flex gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Auto-charge enabled</p>
                      <p className="text-blue-600 dark:text-blue-300">
                        Member must save a payment method. Payments will be automatically charged monthly.
                      </p>
                    </div>
                  </div>
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
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
                           hover:bg-blue-700 transition-colors disabled:opacity-50
                           flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallmentEligibilityModal;
