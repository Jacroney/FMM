import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Settings,
  DollarSign,
  Building2,
  Shield,
} from 'lucide-react';
import { PaymentService } from '../services/paymentService';
import { StripeConnectedAccount } from '../services/types';
import toast from 'react-hot-toast';

interface StripeConnectSetupProps {
  chapterId: string;
  onSetupComplete?: () => void;
}

const StripeConnectSetup: React.FC<StripeConnectSetupProps> = ({
  chapterId,
  onSetupComplete,
}) => {
  const [account, setAccount] = useState<StripeConnectedAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAccountStatus();
  }, [chapterId]);

  const loadAccountStatus = async () => {
    setIsLoading(true);
    try {
      const accountData = await PaymentService.getStripeAccount(chapterId);
      setAccount(accountData);

      // If account exists, refresh status from Stripe
      if (accountData) {
        await refreshAccountStatus();
      }
    } catch (error: any) {
      console.error('Error loading Stripe account:', error);
      // Account doesn't exist yet, that's okay
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccountStatus = async () => {
    setIsRefreshing(true);
    try {
      await PaymentService.refreshStripeAccount(chapterId);
      const updatedAccount = await PaymentService.getStripeAccount(chapterId);
      setAccount(updatedAccount);

      if (
        updatedAccount?.onboarding_completed &&
        updatedAccount?.charges_enabled &&
        onSetupComplete
      ) {
        onSetupComplete();
      }
    } catch (error: any) {
      console.error('Error refreshing account:', error);
      toast.error('Failed to refresh account status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateAccount = async () => {
    setIsCreating(true);
    try {
      const response = await PaymentService.createStripeAccount(chapterId);

      if (response.onboarding_url) {
        // Open Stripe onboarding in new tab
        window.open(response.onboarding_url, '_blank');
        toast.success('Opening Stripe setup. Please complete the form.');

        // Start polling for status updates
        startStatusPolling();
      } else {
        throw new Error('No onboarding URL received');
      }
    } catch (error: any) {
      console.error('Error creating Stripe account:', error);
      toast.error(error.message || 'Failed to start setup');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRetryOnboarding = async () => {
    setIsCreating(true);
    try {
      const response = await PaymentService.createAccountLink(chapterId);

      if (response.onboarding_url) {
        window.open(response.onboarding_url, '_blank');
        toast.success('Opening Stripe setup. Please complete the form.');
        startStatusPolling();
      } else {
        throw new Error('No onboarding URL received');
      }
    } catch (error: any) {
      console.error('Error creating account link:', error);
      toast.error(error.message || 'Failed to restart setup');
    } finally {
      setIsCreating(false);
    }
  };

  const startStatusPolling = () => {
    // Poll every 5 seconds for up to 5 minutes
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes

    const pollInterval = setInterval(async () => {
      pollCount++;

      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const updatedAccount = await PaymentService.getStripeAccount(chapterId);
        setAccount(updatedAccount);

        if (updatedAccount?.onboarding_completed && updatedAccount?.charges_enabled) {
          clearInterval(pollInterval);
          toast.success('Stripe setup complete! You can now accept payments.');
          if (onSetupComplete) {
            onSetupComplete();
          }
        }
      } catch (error) {
        // Continue polling even if there's an error
      }
    }, 5000);

    // Store interval ID to clean up on unmount
    return () => clearInterval(pollInterval);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
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
        </div>
      </div>
    );
  }

  // No account exists yet - show setup wizard
  if (!account) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-gray-800 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Enable Online Payments</h2>
          <p className="text-blue-100">
            Set up Stripe to accept credit card and bank account payments for dues
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Easy Payments</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Accept card and ACH payments directly from members
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Direct Deposits</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Funds deposited directly to your chapter's bank account
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Secure & Trusted</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Industry-leading security powered by Stripe
              </p>
            </div>
          </div>

          {/* What you'll need */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
              What you'll need:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Chapter's legal name and EIN (Tax ID)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Bank account information for deposits</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Authorized officer's personal information</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>5-10 minutes to complete the setup</span>
              </li>
            </ul>
          </div>

          {/* Fees Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Payment Fees:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Credit/Debit Cards:</span>
                <span className="font-medium text-gray-900 dark:text-white">2.9% + $0.30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Bank Account (ACH):</span>
                <span className="font-medium text-gray-900 dark:text-white">$0.80 flat fee</span>
              </div>
            </div>
          </div>

          {/* Start Setup Button */}
          <button
            onClick={handleCreateAccount}
            disabled={isCreating}
            className="w-full px-6 py-4 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg flex items-center justify-center"
          >
            {isCreating ? (
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
                Starting Setup...
              </>
            ) : (
              <>
                <Settings className="w-5 h-5 mr-2" />
                Start Stripe Setup
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            You'll be redirected to Stripe to securely complete the setup process
          </p>
        </div>
      </div>
    );
  }

  // Account exists - show status
  const isFullySetup =
    account.onboarding_completed && account.charges_enabled && account.payouts_enabled;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div
        className={`px-6 py-6 ${
          isFullySetup
            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
            : 'bg-gradient-to-r from-yellow-500 to-orange-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isFullySetup ? (
              <CheckCircle className="w-8 h-8 text-white mr-3" />
            ) : (
              <AlertCircle className="w-8 h-8 text-white mr-3" />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {isFullySetup ? 'Payment Processing Active' : 'Setup In Progress'}
              </h2>
              <p className="text-sm text-white/90">
                {isFullySetup
                  ? 'Your chapter can now accept online payments'
                  : 'Complete the setup to start accepting payments'}
              </p>
            </div>
          </div>
          <button
            onClick={refreshAccountStatus}
            disabled={isRefreshing}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Details */}
      <div className="px-6 py-6">
        <div className="space-y-4">
          {/* Account ID */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Stripe Account:</span>
            <span className="font-mono text-sm text-gray-900 dark:text-white">
              {account.stripe_account_id}
            </span>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatusIndicator
              label="Details Submitted"
              isComplete={account.details_submitted}
            />
            <StatusIndicator label="Charges Enabled" isComplete={account.charges_enabled} />
            <StatusIndicator label="Payouts Enabled" isComplete={account.payouts_enabled} />
            <StatusIndicator label="Bank Account Added" isComplete={account.has_bank_account} />
          </div>

          {/* Action Button */}
          {!isFullySetup && (
            <div className="pt-4">
              <button
                onClick={handleRetryOnboarding}
                disabled={isCreating}
                className="w-full px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                {isCreating ? 'Opening Stripe...' : 'Complete Setup in Stripe'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatusIndicatorProps {
  label: string;
  isComplete: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ label, isComplete }) => {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        isComplete
          ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
      }`}
    >
      <span
        className={`text-sm font-medium ${
          isComplete
            ? 'text-green-900 dark:text-green-200'
            : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        {label}
      </span>
      {isComplete ? (
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
      )}
    </div>
  );
};

export default StripeConnectSetup;
