import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { PlaidService } from '../services/plaidService';
import toast from 'react-hot-toast';
import { Loader2, Building2 } from 'lucide-react';

interface PlaidLinkProps {
  chapterId: string;
  onSuccess?: (connectionId: string, institutionName: string) => void;
  onExit?: () => void;
}

export function PlaidLink({ chapterId, onSuccess, onExit }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Create link token on mount
  useEffect(() => {
    if (!chapterId) return;

    const createToken = async () => {
      try {
        setLoading(true);
        const token = await PlaidService.createLinkToken(chapterId);
        setLinkToken(token);
      } catch (error) {
        console.error('Error creating link token:', error);
        toast.error('Failed to initialize Plaid Link');
      } finally {
        setLoading(false);
      }
    };

    createToken();
  }, [chapterId]);

  // Handle successful link
  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      try {
        setLoading(true);
        toast.loading('Connecting bank account...');

        // Exchange token and save connection
        const { connection_id, institution_name } = await PlaidService.exchangeToken(
          publicToken,
          chapterId
        );

        toast.dismiss();
        toast.success(`${institution_name} connected successfully!`);

        // Optionally auto-sync after connecting
        toast.loading('Syncing transactions...');
        const syncResult = await PlaidService.syncTransactions(connection_id, chapterId);
        toast.dismiss();

        if (syncResult.success) {
          toast.success(`Synced ${syncResult.added} new transactions`);

          // Auto-reconcile
          if (syncResult.added > 0) {
            toast.loading('Processing transactions...');
            const reconcileResult = await PlaidService.reconcile(chapterId, 'plaid_txn_staging');
            toast.dismiss();

            if (reconcileResult?.success) {
              toast.success(
                `Processed ${reconcileResult.records_inserted} transactions`
              );
            }
          }
        }

        onSuccess?.(connection_id, institution_name);
      } catch (error) {
        console.error('Error in Plaid success handler:', error);
        toast.dismiss();
        toast.error('Failed to connect bank account');
      } finally {
        setLoading(false);
      }
    },
    [chapterId, onSuccess]
  );

  const onPlaidExit = useCallback(
    (error: any, metadata: any) => {
      if (error) {
        console.error('Plaid Link exit error:', error);
        toast.error('Failed to connect bank account');
      }
      onExit?.();
    },
    [onExit]
  );

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  };

  const { open, ready } = usePlaidLink(config);

  return (
    <button
      onClick={() => open()}
      disabled={!ready || loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          <Building2 className="h-5 w-5" />
          <span>Link Bank Account</span>
        </>
      )}
    </button>
  );
}
