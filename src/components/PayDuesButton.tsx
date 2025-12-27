import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, Lock, Clock } from 'lucide-react';
import { PaymentService } from '../services/paymentService';
import { MemberDuesSummary, PaymentIntent } from '../services/types';
import StripeCheckoutModal from './StripeCheckoutModal';
import toast from 'react-hot-toast';

interface PayDuesButtonProps {
  memberDues: MemberDuesSummary;
  onPaymentSuccess: () => void;
  refreshKey?: number;
  variant?: 'primary' | 'secondary' | 'small';
  className?: string;
}

const PayDuesButton: React.FC<PayDuesButtonProps> = ({
  memberDues,
  onPaymentSuccess,
  refreshKey = 0,
  variant = 'primary',
  className = '',
}) => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<{
    has_account: boolean;
    onboarding_completed: boolean;
    charges_enabled: boolean;
  } | null>(null);
  const [error, setError] = useState<string>('');
  const [pendingPayment, setPendingPayment] = useState<PaymentIntent | null>(null);

  // Re-check when dues data changes (e.g., after payment modal closes and parent refreshes)
  useEffect(() => {
    checkStripeAccount();
  }, [memberDues.chapter_id]);

  // Check for pending payments when refreshKey changes (parent triggers after data refresh)
  useEffect(() => {
    checkPendingPayment();
  }, [memberDues.id, refreshKey]);

  const checkStripeAccount = async () => {
    setIsCheckingAccount(true);
    setError('');

    try {
      const account = await PaymentService.getStripeAccount(memberDues.chapter_id);

      if (!account) {
        setStripeAccountStatus({
          has_account: false,
          onboarding_completed: false,
          charges_enabled: false,
        });
        setError('Online payments are not set up for your chapter. Please contact your treasurer.');
        return;
      }

      setStripeAccountStatus({
        has_account: true,
        onboarding_completed: account.onboarding_completed,
        charges_enabled: account.charges_enabled,
      });

      if (!account.onboarding_completed || !account.charges_enabled) {
        setError('Online payments are being set up. Please check back soon or contact your treasurer.');
      }
    } catch (err: any) {
      console.error('Error checking Stripe account:', err);
      setError('Unable to check payment status. Please try again later.');
    } finally {
      setIsCheckingAccount(false);
    }
  };

  const checkPendingPayment = async () => {
    try {
      const pending = await PaymentService.getPendingPaymentForDues(memberDues.id);
      setPendingPayment(pending);
    } catch (err) {
      console.error('Error checking pending payment:', err);
      // Don't block the UI if this check fails
    }
  };

  const handlePayClick = () => {
    if (memberDues.balance <= 0) {
      toast.error('No outstanding balance to pay');
      return;
    }

    if (!stripeAccountStatus?.charges_enabled) {
      toast.error('Online payments are not currently available');
      return;
    }

    setShowCheckout(true);
  };

  const handlePaymentSuccess = () => {
    setShowCheckout(false);
    toast.success('Payment successful!');
    // Refresh pending payment status
    checkPendingPayment();
    onPaymentSuccess();
  };

  // Don't show button if balance is 0
  if (memberDues.balance <= 0) {
    return null;
  }

  // Determine button styles based on variant
  const getButtonStyles = () => {
    const baseStyles = 'font-semibold transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';

    switch (variant) {
      case 'primary':
        return `${baseStyles} px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:shadow-none disabled:hover:translate-y-0`;
      case 'secondary':
        return `${baseStyles} px-4 py-2.5 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-2 border-blue-500 dark:border-blue-500 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-600 hover:border-blue-600 dark:hover:border-blue-400`;
      case 'small':
        return `${baseStyles} px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-sm hover:shadow-md`;
      default:
        return baseStyles;
    }
  };

  const getIconSize = () => {
    return variant === 'small' ? 'w-4 h-4' : 'w-5 h-5';
  };

  // Show loading state while checking account
  if (isCheckingAccount) {
    return (
      <button
        disabled
        className={`${getButtonStyles()} ${className}`}
      >
        <div className={`animate-spin mr-2 ${getIconSize()} border-2 border-white/30 border-t-white rounded-full`}></div>
        Checking...
      </button>
    );
  }

  // Show pending payment state if a payment is already in progress
  if (pendingPayment) {
    const isProcessing = pendingPayment.status === 'processing';
    const paymentType = pendingPayment.payment_method_type === 'us_bank_account' ? 'Bank transfer' : 'Card payment';

    return (
      <div className="space-y-3">
        <div
          className={`font-semibold transition-all duration-200 flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-lg shadow-amber-500/25 cursor-default ${className}`}
        >
          <Clock className={`mr-2 ${getIconSize()} animate-pulse`} />
          {variant === 'small' ? 'Processing' : 'Payment Processing'}
        </div>
        {variant !== 'small' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold">{paymentType} {isProcessing ? 'is processing' : 'is pending'}</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                {pendingPayment.payment_method_type === 'us_bank_account'
                  ? 'Bank transfers typically take 3-5 business days to complete.'
                  : 'Your payment is being processed.'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show error state if account is not ready
  if (error) {
    return (
      <div className="space-y-3">
        <button
          disabled
          className={`font-semibold transition-all duration-200 flex items-center justify-center px-6 py-3.5 bg-gray-400 dark:bg-gray-600 text-white rounded-xl cursor-not-allowed ${className}`}
          title={error}
        >
          <Lock className={`mr-2 ${getIconSize()}`} />
          Pay Online
        </button>
        {variant !== 'small' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 flex items-start gap-3">
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/50">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handlePayClick}
        className={`${getButtonStyles()} ${className}`}
        disabled={!stripeAccountStatus?.charges_enabled}
      >
        <CreditCard className={`mr-2 ${getIconSize()}`} />
        {variant === 'small' ? 'Pay' : `Pay $${memberDues.balance.toFixed(2)}`}
      </button>

      {/* Checkout Modal */}
      <StripeCheckoutModal
        memberDues={memberDues}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};

export default PayDuesButton;
