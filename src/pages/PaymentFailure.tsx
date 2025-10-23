import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, HelpCircle, RefreshCw } from 'lucide-react';

const PaymentFailure: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(15);

  const errorMessage = searchParams.get('message') || 'Payment could not be processed';
  const errorCode = searchParams.get('code');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // Auto-redirect after 15 seconds
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/dues');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleReturnToDues = () => {
    navigate('/dues');
  };

  const handleTryAgain = () => {
    navigate('/dues?retry=true');
  };

  const getErrorDetails = () => {
    const commonErrors: Record<string, { title: string; description: string; solutions: string[] }> = {
      card_declined: {
        title: 'Card Declined',
        description: 'Your card was declined by your bank.',
        solutions: [
          'Check that you have sufficient funds',
          'Verify your card details are correct',
          'Contact your bank to authorize the transaction',
          'Try a different payment method',
        ],
      },
      insufficient_funds: {
        title: 'Insufficient Funds',
        description: 'Your account does not have enough funds for this transaction.',
        solutions: [
          'Check your account balance',
          'Try a different payment method',
          'Make a partial payment if available',
        ],
      },
      expired_card: {
        title: 'Card Expired',
        description: 'The card you used has expired.',
        solutions: ['Use a different card', 'Update your card information with your bank'],
      },
      incorrect_cvc: {
        title: 'Invalid Security Code',
        description: 'The security code (CVC) you entered is incorrect.',
        solutions: [
          'Check the 3 or 4 digit code on the back of your card',
          'Try entering it again carefully',
        ],
      },
      processing_error: {
        title: 'Processing Error',
        description: 'There was an error processing your payment.',
        solutions: [
          'Wait a few minutes and try again',
          'Check your internet connection',
          'Contact support if the problem persists',
        ],
      },
    };

    return (
      commonErrors[errorCode || ''] || {
        title: 'Payment Failed',
        description: errorMessage,
        solutions: [
          'Double-check your payment information',
          'Try a different payment method',
          'Contact your bank if the problem persists',
          'Reach out to your treasurer for assistance',
        ],
      }
    );
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Error Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Error Icon Header */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-12 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white dark:bg-gray-800 rounded-full mb-4 shadow-lg">
              <XCircle className="w-16 h-16 text-red-600 dark:text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Payment Failed</h1>
            <p className="text-red-100 text-lg">{errorDetails.title}</p>
          </div>

          {/* Error Details */}
          <div className="px-6 py-8">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
              <h2 className="text-sm font-semibold text-red-900 dark:text-red-200 uppercase tracking-wide mb-3">
                What went wrong?
              </h2>
              <p className="text-red-800 dark:text-red-300 mb-4">{errorDetails.description}</p>
              {amount && (
                <div className="flex justify-between items-center pt-3 border-t border-red-200 dark:border-red-800">
                  <span className="text-red-700 dark:text-red-400">Attempted Amount:</span>
                  <span className="font-bold text-xl text-red-900 dark:text-red-200">
                    ${parseFloat(amount).toFixed(2)}
                  </span>
                </div>
              )}
              {errorCode && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <span className="text-xs text-red-700 dark:text-red-400 font-mono">
                    Error Code: {errorCode}
                  </span>
                </div>
              )}
            </div>

            {/* Solutions */}
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    What you can do:
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    {errorDetails.solutions.map((solution, index) => (
                      <li key={index}>• {solution}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Common Issues */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Common Issues:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start">
                  <span className="text-gray-400 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Card number entered correctly
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-400 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Expiration date is correct
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-400 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Security code matches</span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-400 mr-2">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Billing address is correct
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleTryAgain}
                className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center justify-center font-medium"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </button>
              <button
                onClick={handleReturnToDues}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center font-medium"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Return to Dues
              </button>
            </div>

            {/* Auto-redirect Notice */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Redirecting to Dues page in {countdown} seconds...
            </p>
          </div>
        </div>

        {/* Support Contact */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Still having trouble?</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Contact your chapter treasurer or email{' '}
            <a
              href="mailto:support@greekpay.com"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              support@greekpay.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;
