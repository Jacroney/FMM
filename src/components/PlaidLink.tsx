import React, { useCallback, useState } from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';
import { PlaidService } from '../services/plaidService';
import toast from 'react-hot-toast';
import { Building2, Loader2 } from 'lucide-react';

interface PlaidLinkProps {
  onSuccess?: () => void;
  onExit?: () => void;
  className?: string;
  buttonText?: string;
}

export const PlaidLink: React.FC<PlaidLinkProps> = ({
  onSuccess,
  onExit,
  className,
  buttonText = 'Connect Bank Account',
}) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle successful connection
  const handleOnSuccess: PlaidLinkOnSuccess = useCallback(
    async (public_token, metadata) => {
      try {
        setIsLoading(true);
        console.log('Plaid Link success, exchanging token...');

        // Exchange public token for access token
        const result = await PlaidService.exchangePublicToken(public_token);

        toast.success(
          `Successfully connected ${result.institution_name} with ${result.accounts_count} account(s)!`,
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
    [onSuccess]
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

  // Create link token when button is clicked
  const handleClick = async () => {
    if (linkToken) {
      // Token already exists, open Plaid Link
      open();
    } else {
      // Need to create a link token first
      try {
        setIsLoading(true);
        const response = await PlaidService.createLinkToken();
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
    <button
      onClick={handleClick}
      disabled={isLoading || (linkToken !== null && !ready)}
      className={
        className ||
        'flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200'
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
        </>
      )}
    </button>
  );
};

export default PlaidLink;
