import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { X, CreditCard, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import { PaymentService } from '../services/paymentService';
import { MemberDuesSummary } from '../services/types';
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
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  memberDues,
  clientSecret,
  onSuccess,
  onCancel,
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
          return_url: `${window.location.origin}/dues?payment=success`,
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
      {/* Payment Element */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'us_bank_account'],
          }}
        />
      </div>

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
            `Pay $${memberDues.balance.toFixed(2)}`
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

  useEffect(() => {
    if (isOpen && memberDues.balance > 0) {
      createPaymentIntent();
    }
  }, [isOpen, memberDues.id]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await PaymentService.createPaymentIntent(
        memberDues.id,
        paymentMethodType,
        memberDues.balance
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

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 dark:bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
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
                <span className="text-gray-900 dark:text-white">${memberDues.base_amount.toFixed(2)}</span>
              </div>
              {memberDues.late_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Late Fee:</span>
                  <span className="text-red-600 dark:text-red-400">${memberDues.late_fee.toFixed(2)}</span>
                </div>
              )}
              {memberDues.adjustments !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Adjustments:</span>
                  <span className={memberDues.adjustments > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {memberDues.adjustments > 0 ? '+' : ''}${memberDues.adjustments.toFixed(2)}
                  </span>
                </div>
              )}
              {memberDues.amount_paid > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Already Paid:</span>
                  <span className="text-green-600 dark:text-green-400">-${memberDues.amount_paid.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Amount Due:</span>
                <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                  ${memberDues.balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Methods Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-600">
              <div className="flex items-center mb-2">
                <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Credit/Debit Card</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Instant processing<br />
                Fee: 2.9% + $0.30
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-2 border-gray-200 dark:border-gray-600">
              <div className="flex items-center mb-2">
                <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Bank Account (ACH)</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                3-5 business days<br />
                Flat fee: $0.80
              </p>
            </div>
          </div>

          {/* Checkout Form */}
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
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
