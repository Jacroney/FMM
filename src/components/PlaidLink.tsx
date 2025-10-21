import React, { useCallback, useState } from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';
import { PlaidService } from '../services/plaidService';
import toast from 'react-hot-toast';
import { Building2, Loader2, TestTube2, ShieldCheck } from 'lucide-react';

interface PlaidLinkProps {
  onSuccess?: () => void;
  onExit?: () => void;
  className?: string;
  buttonText?: string;
  showEnvironmentToggle?: boolean; // Show environment selector (admin only)
}

export const PlaidLink: React.FC<PlaidLinkProps> = ({
  onSuccess,
  onExit,
  className,
  buttonText = 'Connect Bank Account',
  showEnvironmentToggle = false,
}) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>(
    PlaidService.getEnvironment()
  );

  // Handle successful connection
  const handleOnSuccess: PlaidLinkOnSuccess = useCallback(
    async (public_token, metadata) => {
      try {
        setIsLoading(true);
        console.log('Plaid Link success, exchanging token...');

        // Exchange public token for access token
        const result = await PlaidService.exchangePublicToken(public_token, environment);

        const envBadge = environment === 'sandbox' ? ' [Sandbox]' : ' [Production]';
        toast.success(
          `Successfully connected ${result.institution_name}${envBadge} with ${result.accounts_count} account(s)!`,
          { duration: 5000 }
        );

        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        console.error('Error exchanging token:', error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to connect bank account'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, environment]
  );

  // Handle exit from Plaid Link
  const handleOnExit: PlaidLinkOnExit = useCallback(
    (error, metadata) => {
      if (error) {
        console.error('Plaid Link error:', error);
        toast.error('Failed to connect bank account');
      }

      if (onExit) {
        onExit();
      }
    },
    [onExit]
  );

  // Initialize Plaid Link
  const config = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  };

  const { open, ready } = usePlaidLink(config);

  // Handle environment change
  const handleEnvironmentChange = (newEnv: 'sandbox' | 'production') => {
    setEnvironment(newEnv);
    PlaidService.setEnvironment(newEnv);
    setLinkToken(null); // Clear link token to force recreation with new environment
    toast.success(`Switched to ${newEnv} mode`, { duration: 2000 });
  };

  // Create link token when button is clicked
  const handleClick = async () => {
    if (linkToken) {
      // Token already exists, open Plaid Link
      open();
    } else {
      // Need to create a link token first
      try {
        setIsLoading(true);
        const response = await PlaidService.createLinkToken(environment);
        setLinkToken(response.link_token);

        // After setting token, open will be ready on next render
        // We'll open it in a useEffect or just let user click again
        toast.success('Ready to connect! Click again to continue.');
      } catch (error) {
        console.error('Error creating link token:', error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to initialize connection'
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Auto-open when ready after token is created
  React.useEffect(() => {
    if (linkToken && ready && !isLoading) {
      open();
    }
  }, [linkToken, ready, isLoading, open]);

  return (
    <div className="space-y-3">
      {showEnvironmentToggle && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-700">Environment:</span>
          <button
            onClick={() => handleEnvironmentChange('production')}
            disabled={isLoading}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              environment === 'production'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Production
          </button>
          <button
            onClick={() => handleEnvironmentChange('sandbox')}
            disabled={isLoading}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              environment === 'sandbox'
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <TestTube2 className="h-4 w-4" />
            Sandbox (Test)
          </button>
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={isLoading || (linkToken !== null && !ready)}
        className={
          className ||
          `flex items-center gap-2 ${
            environment === 'sandbox'
              ? 'bg-yellow-500 hover:bg-yellow-600'
              : 'bg-blue-600 hover:bg-blue-700'
          } disabled:bg-gray-400 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200`
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Building2 className="h-5 w-5" />
            <span>{buttonText}</span>
            {environment === 'sandbox' && (
              <span className="ml-1 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded">
                TEST
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
};

export default PlaidLink;
