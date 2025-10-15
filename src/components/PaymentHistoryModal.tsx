import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DuesService } from '../services/duesService';
import { DuesPayment, MemberDues } from '../services/types';
import toast from 'react-hot-toast';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PaymentHistoryModal
 *
 * Displays a member's payment history for dues including:
 * - All payments made
 * - Payment dates, amounts, and methods
 * - Total amount paid
 */
const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose
}) => {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<DuesPayment[]>([]);
  const [memberDues, setMemberDues] = useState<MemberDues[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && profile?.id) {
      loadPaymentHistory();
    }
  }, [isOpen, profile?.id]);

  const loadPaymentHistory = async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      // Get all member dues records for this member
      const duesRecords = await DuesService.getMemberDuesByMember(profile.id);
      setMemberDues(duesRecords);

      // Get all payments for all dues records
      const allPayments: DuesPayment[] = [];
      for (const dues of duesRecords) {
        const duesPayments = await DuesService.getPayments(dues.id);
        allPayments.push(...duesPayments);
      }

      // Sort by payment date (most recent first)
      allPayments.sort((a, b) =>
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );

      setPayments(allPayments);
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-slideUp sm:animate-none">
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Payment History
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your dues payment records
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95 touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {isLoading ? (
            // Loading State
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                Loading payment history...
              </div>
            </div>
          ) : payments.length === 0 ? (
            // Empty State
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No payment history
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You haven't made any dues payments yet.
              </p>
            </div>
          ) : (
            // Payment List
            <>
              {/* Summary Card */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                      Total Payments Made
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                      {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
              </div>

              {/* Payment Table */}
              <div className="space-y-2.5 sm:space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(payment.amount)}
                          </span>
                          {payment.payment_method && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 w-fit">
                              {payment.payment_method}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                          <p>
                            <span className="font-medium">Date:</span> {formatDate(payment.payment_date)}
                          </p>
                          {payment.reference_number && (
                            <p className="truncate">
                              <span className="font-medium">Ref:</span> {payment.reference_number}
                            </p>
                          )}
                          {payment.notes && (
                            <p className="mt-1 italic text-xs">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-[0.99] touch-manipulation"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;
