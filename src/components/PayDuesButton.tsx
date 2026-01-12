import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, Lock, Clock, DollarSign, ChevronDown } from 'lucide-react';
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
  allowPartialPayment?: boolean; // Enable partial payment option
}

const PayDuesButton: React.FC<PayDuesButtonProps> = ({
  memberDues,
  onPaymentSuccess,
  refreshKey = 0,
  variant = 'primary',
  className = '',
  allowPartialPayment = false,
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

  // Partial payment state
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'full' | 'custom'>('full');
  const [customAmount, setCustomAmount] = useState<string>('');

  // Auto-enable partial payment for members with flexible plans
  const hasFlexiblePlan = !!memberDues.flexible_plan_deadline;
  const showPartialOption = allowPartialPayment || hasFlexiblePlan;

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

    // Show payment options if partial payment is enabled
    if (showPartialOption && !showPaymentOptions) {
      setShowPaymentOptions(true);
      return;
    }

    // Validate custom amount if in custom mode
    if (paymentMode === 'custom') {
      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }
      if (amount > memberDues.balance) {
        toast.error('Payment amount cannot exceed balance');
        return;
      }
      if (amount < 1) {
        toast.error('Minimum payment amount is $1.00');
        return;
      }
    }

    setShowCheckout(true);
  };

  const handlePaymentSuccess = () => {
    setShowCheckout(false);
    setShowPaymentOptions(false);
    setPaymentMode('full');
    setCustomAmount('');
    toast.success('Payment successful!');
    // Refresh pending payment status
    checkPendingPayment();
    onPaymentSuccess();
  };

  const handleCancelPaymentOptions = () => {
    setShowPaymentOptions(false);
    setPaymentMode('full');
    setCustomAmount('');
  };

  // Get the actual payment amount based on mode
  const getPaymentAmount = (): number | undefined => {
    if (paymentMode === 'custom' && customAmount) {
      const amount = parseFloat(customAmount);
      if (!isNaN(amount) && amount > 0 && amount < memberDues.balance) {
        return amount;
      }
    }
    return undefined; // Full payment
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
  // Only show for statuses that indicate an active/valid payment attempt
  if (pendingPayment && ['pending', 'processing', 'requires_action'].includes(pendingPayment.status)) {
    const status = pendingPayment.status;
    const paymentType = pendingPayment.payment_method_type === 'us_bank_account' ? 'Bank transfer' : 'Card payment';

    // Determine display based on status
    const getStatusDisplay = () => {
      switch (status) {
        case 'processing':
          return {
            buttonText: variant === 'small' ? 'Processing' : 'Payment Processing',
            buttonClass: 'from-green-500 to-emerald-500 shadow-green-500/25',
            title: `${paymentType} is processing`,
            message: 'Bank transfers typically take 3-5 business days to complete.',
            bgClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
            iconBgClass: 'bg-green-100 dark:bg-green-900/50',
            iconClass: 'text-green-600 dark:text-green-400',
            textClass: 'text-green-800 dark:text-green-200',
            subtextClass: 'text-green-700 dark:text-green-300',
          };
        case 'requires_action':
          return {
            buttonText: variant === 'small' ? 'Action Needed' : 'Action Needed',
            buttonClass: 'from-yellow-500 to-amber-500 shadow-yellow-500/25',
            title: 'Bank verification needed',
            message: 'Check your email for bank verification instructions. You\'ll need to enter a code from your bank statement to complete payment.',
            bgClass: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
            iconBgClass: 'bg-yellow-100 dark:bg-yellow-900/50',
            iconClass: 'text-yellow-600 dark:text-yellow-400',
            textClass: 'text-yellow-800 dark:text-yellow-200',
            subtextClass: 'text-yellow-700 dark:text-yellow-300',
          };
        default: // 'pending'
          return {
            buttonText: variant === 'small' ? 'Pending' : 'Payment Pending',
            buttonClass: 'from-amber-500 to-orange-500 shadow-amber-500/25',
            title: `${paymentType} is pending`,
            message: 'Your payment is being processed.',
            bgClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700',
            iconBgClass: 'bg-amber-100 dark:bg-amber-900/50',
            iconClass: 'text-amber-600 dark:text-amber-400',
            textClass: 'text-amber-800 dark:text-amber-200',
            subtextClass: 'text-amber-700 dark:text-amber-300',
          };
      }
    };

    const display = getStatusDisplay();

    return (
      <div className="space-y-3">
        <div
          className={`font-semibold transition-all duration-200 flex items-center justify-center px-6 py-3.5 bg-gradient-to-r ${display.buttonClass} text-white rounded-xl shadow-lg cursor-default ${className}`}
        >
          <Clock className={`mr-2 ${getIconSize()} animate-pulse`} />
          {display.buttonText}
        </div>
        {variant !== 'small' && (
          <div className={`${display.bgClass} border rounded-xl p-4 flex items-start gap-3`}>
            <div className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg ${display.iconBgClass}`}>
              <Clock className={`w-4 h-4 ${display.iconClass}`} />
            </div>
            <div className={`text-sm ${display.textClass}`}>
              <p className="font-semibold">{display.title}</p>
              <p className={`${display.subtextClass} mt-1`}>{display.message}</p>
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

  // Show payment options dropdown when partial payment is available
  if (showPaymentOptions && showPartialOption) {
    return (
      <div className="space-y-3">
        <div className="surface-card overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Choose Payment Amount</h3>
              <button
                onClick={handleCancelPaymentOptions}
                className="text-white/70 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {/* Full Payment Option */}
            <button
              onClick={() => setPaymentMode('full')}
              className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                paymentMode === 'full'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">Pay Full Balance</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  ${memberDues.balance.toFixed(2)}
                </span>
              </div>
            </button>

            {/* Custom Amount Option */}
            <button
              onClick={() => setPaymentMode('custom')}
              className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                paymentMode === 'custom'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white">Pay Custom Amount</span>
              </div>
            </button>

            {/* Custom Amount Input */}
            {paymentMode === 'custom' && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enter amount ($1.00 - ${memberDues.balance.toFixed(2)})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="1"
                    max={memberDues.balance}
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {customAmount && parseFloat(customAmount) > 0 && parseFloat(customAmount) < memberDues.balance && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Remaining after payment: ${(memberDues.balance - parseFloat(customAmount)).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Flexible Plan Deadline Info */}
            {hasFlexiblePlan && memberDues.flexible_plan_deadline && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  <span className="font-semibold">Flexible Payment Plan</span> - Pay any amount until{' '}
                  {new Date(memberDues.flexible_plan_deadline).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handlePayClick}
              disabled={paymentMode === 'custom' && (!customAmount || parseFloat(customAmount) <= 0)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {paymentMode === 'custom' && customAmount
                ? `Pay $${parseFloat(customAmount).toFixed(2)}`
                : `Pay $${memberDues.balance.toFixed(2)}`}
            </button>
          </div>
        </div>

        {/* Checkout Modal */}
        <StripeCheckoutModal
          memberDues={memberDues}
          isOpen={showCheckout}
          onClose={() => {
            setShowCheckout(false);
          }}
          onSuccess={handlePaymentSuccess}
          customAmount={getPaymentAmount()}
        />
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
        {showPartialOption && variant !== 'small' && (
          <ChevronDown className="ml-1 w-4 h-4" />
        )}
      </button>

      {/* Checkout Modal */}
      <StripeCheckoutModal
        memberDues={memberDues}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={handlePaymentSuccess}
        customAmount={getPaymentAmount()}
      />
    </>
  );
};

export default PayDuesButton;
