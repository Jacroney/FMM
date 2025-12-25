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
    const baseStyles = 'font-medium transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';

    switch (variant) {
      case 'primary':
        return `${baseStyles} px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 shadow-md hover:shadow-lg`;
      case 'secondary':
        return `${baseStyles} px-4 py-2 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-600`;
      case 'small':
        return `${baseStyles} px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800`;
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
        <svg
          className={`animate-spin mr-2 ${getIconSize()}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Checking...
      </button>
    );
  }

  // Show pending payment state if a payment is already in progress
  if (pendingPayment) {
    const isProcessing = pendingPayment.status === 'processing';
    const paymentType = pendingPayment.payment_method_type === 'us_bank_account' ? 'Bank transfer' : 'Card payment';

    return (
      <div className="space-y-2">
        <div
          className={`${getButtonStyles()} ${className} bg-amber-500 dark:bg-amber-600 hover:bg-amber-500 dark:hover:bg-amber-600 cursor-default`}
        >
          <Clock className={`mr-2 ${getIconSize()} animate-pulse`} />
          {variant === 'small' ? 'Processing' : 'Payment Processing'}
        </div>
        {variant !== 'small' && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">{paymentType} {isProcessing ? 'is processing' : 'is pending'}</p>
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
      <div className="space-y-2">
        <button
          disabled
          className={`${getButtonStyles()} ${className} opacity-50 cursor-not-allowed`}
          title={error}
        >
          <Lock className={`mr-2 ${getIconSize()}`} />
          Pay Online
        </button>
        {variant !== 'small' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
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
