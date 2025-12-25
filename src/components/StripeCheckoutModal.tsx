import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { X, CreditCard, Building2, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { PaymentService } from '../services/paymentService';
import { formatCurrency } from '../utils/currency';
import { MemberDuesSummary, SavedPaymentMethod } from '../services/types';
import toast from 'react-hot-toast';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripeCheckoutModalProps {
  memberDues: MemberDuesSummary;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CheckoutFormProps {
  memberDues: MemberDuesSummary;
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  savePaymentMethod: boolean;
  onSaveToggle: (save: boolean) => void;
  totalCharge: number;
  paymentMethodType: 'card' | 'us_bank_account';
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  memberDues,
  clientSecret,
  onSuccess,
  onCancel,
  savePaymentMethod,
  onSaveToggle,
  totalCharge,
  paymentMethodType,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentComplete, setPaymentComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/app/payment-success`,
        },
        redirect: 'if_required', // Stay on page if possible
      });

      if (error) {
        // Payment failed
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        setPaymentComplete(true);
        toast.success('Payment successful!');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        // Payment is processing (common for ACH)
        setPaymentComplete(true);
        toast.success('Payment is processing. You will receive confirmation once complete.');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      toast.error('Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentComplete) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Payment Successful!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Thank you for your payment. You will receive a confirmation email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element - only shows the selected payment method type */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <PaymentElement
          options={{
            layout: 'accordion',
            paymentMethodOrder: [paymentMethodType],
          }}
        />
      </div>

      {/* Save for Future Checkbox */}
      <label className="flex items-center space-x-3 cursor-pointer">
        <input
          type="checkbox"
          checked={savePaymentMethod}
          onChange={(e) => onSaveToggle(e.target.checked)}
          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Save this payment method for future payments
        </span>
      </label>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-4 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              Processing...
            </>
          ) : (
            `Pay ${formatCurrency(totalCharge)}`
          )}
        </button>
      </div>

      {/* Security Notice */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Secured by Stripe. Your payment information is encrypted and secure.
      </p>
    </form>
  );
};

const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  memberDues,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'us_bank_account'>('card');

  // Saved payment methods state
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string | null>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [usingSavedMethod, setUsingSavedMethod] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    if (isOpen && memberDues.balance > 0) {
      loadSavedPaymentMethods();
      setPaymentComplete(false);
      setSelectedSavedMethod(null);
      setUsingSavedMethod(false);
    }
  }, [isOpen, memberDues.id]);

  useEffect(() => {
    // Create payment intent when not using a saved method
    // Also recreate when payment method type changes (fees are different for card vs ACH)
    if (isOpen && memberDues.balance > 0 && !usingSavedMethod) {
      createPaymentIntent();
    }
  }, [isOpen, memberDues.id, usingSavedMethod, savePaymentMethod, paymentMethodType]);

  const loadSavedPaymentMethods = async () => {
    try {
      const methods = await PaymentService.getSavedPaymentMethods(memberDues.member_id);
      setSavedMethods(methods);
    } catch (err) {
      console.error('Error loading saved payment methods:', err);
      // Don't show error - just continue without saved methods
    }
  };

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await PaymentService.createPaymentIntent(
        memberDues.id,
        paymentMethodType,
        memberDues.balance,
        savePaymentMethod
      );

      if (response.client_secret) {
        setClientSecret(response.client_secret);
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.message || 'Failed to initialize payment. Please try again.');
      toast.error('Failed to initialize payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseSavedMethod = async (methodId: string) => {
    setIsLoading(true);
    setError('');
    setSelectedSavedMethod(methodId);
    setUsingSavedMethod(true);

    try {
      const response = await PaymentService.createPaymentIntent(
        memberDues.id,
        'card', // Type doesn't matter for saved methods
        memberDues.balance,
        false,
        methodId
      );

      if (response.payment_complete) {
        // Payment succeeded immediately
        setPaymentComplete(true);
        toast.success('Payment successful!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else if (response.requires_action) {
        // Need additional action - use Elements
        setClientSecret(response.client_secret || '');
        toast.info('Additional verification required');
      } else {
        // Payment in progress (ACH)
        setPaymentComplete(true);
        toast.success('Payment is processing!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error using saved payment method:', err);
      setError(err.message || 'Failed to process payment. Please try again.');
      toast.error('Failed to process payment');
      setUsingSavedMethod(false);
      setSelectedSavedMethod(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseNewMethod = () => {
    setUsingSavedMethod(false);
    setSelectedSavedMethod(null);
    createPaymentIntent();
  };

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 dark:bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pay Dues</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {memberDues.period_name} - {memberDues.fiscal_year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Payment Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Member:</span>
                <span className="font-medium text-gray-900 dark:text-white">{memberDues.member_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Base Amount:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(memberDues.base_amount)}</span>
              </div>
              {memberDues.late_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Late Fee:</span>
                  <span className="text-red-600 dark:text-red-400">{formatCurrency(memberDues.late_fee)}</span>
                </div>
              )}
              {memberDues.adjustments !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Adjustments:</span>
                  <span className={memberDues.adjustments > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {memberDues.adjustments > 0 ? '+' : ''}{formatCurrency(Math.abs(memberDues.adjustments))}
                  </span>
                </div>
              )}
              {memberDues.amount_paid > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Already Paid:</span>
                  <span className="text-green-600 dark:text-green-400">-{formatCurrency(memberDues.amount_paid)}</span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Dues Amount:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(memberDues.balance)}
                </span>
              </div>
              {/* Fee Breakdown */}
              <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800">
                {paymentMethodType === 'us_bank_account' ? (
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      No Processing Fees!
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Bank transfer is the recommended payment method
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Processing fees:
                    </p>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Card Processing:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(PaymentService.calculateStripeFee(memberDues.balance, paymentMethodType))}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
                      Switch to Bank Account (ACH) to avoid fees
                    </p>
                  </>
                )}
              </div>
              {/* Total */}
              <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Total to Pay:</span>
                <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                  {formatCurrency(PaymentService.calculateTotalCharge(memberDues.balance, paymentMethodType))}
                </span>
              </div>
            </div>
          </div>

          {/* Saved Payment Methods */}
          {savedMethods.length > 0 && !paymentComplete && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Saved Payment Methods</h3>
              <div className="space-y-2">
                {savedMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handleUseSavedMethod(method.stripe_payment_method_id)}
                    disabled={isLoading}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      selectedSavedMethod === method.stripe_payment_method_id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 bg-gray-50 dark:bg-gray-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center">
                      {method.type === 'card' ? (
                        <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                      ) : (
                        <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                      )}
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {method.brand} ****{method.last4}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {method.type === 'card' ? 'Credit/Debit Card' : 'Bank Account'}
                        </p>
                      </div>
                    </div>
                    {method.is_default && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={handleUseNewMethod}
                  disabled={isLoading}
                  className={`w-full flex items-center p-4 rounded-lg border-2 transition-all ${
                    !usingSavedMethod
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 bg-gray-50 dark:bg-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                  <span className="font-medium text-gray-900 dark:text-white">Use a new payment method</span>
                </button>
              </div>
            </div>
          )}

          {/* Payment Methods Info - only show when using new method */}
          {(!usingSavedMethod || savedMethods.length === 0) && !paymentComplete && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethodType('card')}
                className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-2 transition-all text-left ${
                  paymentMethodType === 'card'
                    ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center mb-2">
                  <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Credit/Debit Card</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Instant processing<br />
                  Fee: {formatCurrency(PaymentService.calculateStripeFee(memberDues.balance, 'card'))}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodType('us_bank_account')}
                className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-2 transition-all text-left ${
                  paymentMethodType === 'us_bank_account'
                    ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center mb-2">
                  <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Bank Account (ACH)</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  3-5 business days<br />
                  No fee
                </p>
              </button>
            </div>
          )}

          {/* Payment Complete Message */}
          {paymentComplete && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Payment Successful!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Thank you for your payment. You will receive a confirmation email shortly.
              </p>
            </div>
          )}

          {/* Checkout Form - only show when not using saved method and not complete */}
          {!paymentComplete && !usingSavedMethod && (
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <svg
                      className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto mb-4"
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
                    <p className="text-gray-600 dark:text-gray-400">Initializing payment...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6">
                  <div className="flex items-start">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">Payment Error</h3>
                      <p className="text-sm text-red-800 dark:text-red-300 mb-4">{error}</p>
                      <button
                        onClick={createPaymentIntent}
                        className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors text-sm font-medium"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              ) : clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#2563eb',
                        colorBackground: '#ffffff',
                        colorText: '#1f2937',
                        colorDanger: '#dc2626',
                        fontFamily: 'system-ui, sans-serif',
                        borderRadius: '8px',
                      },
                    },
                  }}
                >
                  <CheckoutForm
                    memberDues={memberDues}
                    clientSecret={clientSecret}
                    onSuccess={handleSuccess}
                    onCancel={onClose}
                    savePaymentMethod={savePaymentMethod}
                    onSaveToggle={setSavePaymentMethod}
                    totalCharge={PaymentService.calculateTotalCharge(memberDues.balance, paymentMethodType)}
                    paymentMethodType={paymentMethodType}
                  />
                </Elements>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
