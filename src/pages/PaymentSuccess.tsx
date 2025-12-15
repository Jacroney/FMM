import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Download, ArrowLeft, Receipt } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(10);

  const paymentIntentId = searchParams.get('payment_intent');
  const amount = searchParams.get('amount');
  const memberName = searchParams.get('member');

  useEffect(() => {
    // Auto-redirect after 10 seconds
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Success Icon Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-12 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white dark:bg-gray-800 rounded-full mb-4 shadow-lg">
              <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-green-100 text-lg">Thank you for your payment</p>
          </div>

          {/* Payment Details */}
          <div className="px-6 py-8">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Payment Details
              </h2>
              <div className="space-y-3">
                {memberName && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Member:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{memberName}</span>
                  </div>
                )}
                {amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Amount Paid:</span>
                    <span className="font-bold text-2xl text-green-600 dark:text-green-400">
                      {formatCurrency(parseFloat(amount))}
                    </span>
                  </div>
                )}
                {paymentIntentId && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300 max-w-xs text-right break-all">
                      {paymentIntentId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    What happens next?
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• A confirmation email has been sent to your email address</li>
                    <li>• Your payment will be reflected in your account within 24 hours</li>
                    <li>• You can view your payment history in the Dues section</li>
                    <li>• Contact your treasurer if you have any questions</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReturnToDues}
                className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center justify-center font-medium"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Return to Dues
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center font-medium"
              >
                <Download className="w-5 h-5 mr-2" />
                Print Receipt
              </button>
            </div>

            {/* Auto-redirect Notice */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Redirecting to Dues page in {countdown} seconds...
            </p>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need help? Contact your chapter treasurer or email{' '}
            <a
              href="mailto:support@greekpay.com"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              support@greekpay.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
