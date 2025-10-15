import React, { useState, useEffect } from 'react';
import {
  Building2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Clock,
  CreditCard,
} from 'lucide-react';
import { PlaidService } from '../services/plaidService';
import { useChapter } from '../context/ChapterContext';
import { PlaidConnectionWithDetails, PlaidAccount } from '../services/types';
import PlaidLink from '../components/PlaidLink';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number | null) => {
  if (amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface ConnectionCardProps {
  connection: PlaidConnectionWithDetails;
  onSync: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
  isSyncing: boolean;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onSync,
  onDelete,
  isSyncing,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const loadAccounts = async () => {
    if (accounts.length === 0 && !loadingAccounts) {
      setLoadingAccounts(true);
      try {
        const fetchedAccounts = await PlaidService.getAccountsForConnection(connection.id);
        setAccounts(fetchedAccounts);
      } catch (error) {
        console.error('Error loading accounts:', error);
        toast.error('Failed to load accounts');
      } finally {
        setLoadingAccounts(false);
      }
    }
  };

  const handleExpand = () => {
    if (!expanded) {
      loadAccounts();
    }
    setExpanded(!expanded);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {connection.institution_name || 'Unknown Institution'}
              </h3>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{connection.account_count} account(s)</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {PlaidService.formatLastSyncTime(connection.last_synced_at)}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(connection.total_balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSync(connection.id)}
              disabled={isSyncing}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
              title="Sync transactions"
            >
              <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => onDelete(connection.id)}
              disabled={isSyncing}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              title="Remove connection"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleExpand}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="View accounts"
            >
              {expanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Accounts Section */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-6">
          {loadingAccounts ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Loading accounts...
              </p>
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No accounts found
            </p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {account.account_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {account.account_subtype} ••{account.mask}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(account.current_balance)}
                    </p>
                    {account.available_balance !== null && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Available: {formatCurrency(account.available_balance)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function PlaidSync() {
  const { currentChapter } = useChapter();
  const [connections, setConnections] = useState<PlaidConnectionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);

  const loadData = async () => {
    if (!currentChapter?.id) return;

    try {
      setLoading(true);
      const [fetchedConnections, balance] = await Promise.all([
        PlaidService.getConnections(currentChapter.id),
        PlaidService.getTotalBankBalance(currentChapter.id),
      ]);

      setConnections(fetchedConnections);
      setTotalBalance(balance);
    } catch (error) {
      console.error('Error loading Plaid data:', error);
      toast.error('Failed to load bank connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentChapter?.id]);

  const handleSync = async (connectionId: string) => {
    try {
      setSyncing(connectionId);
      const result = await PlaidService.syncTransactions(connectionId);
      toast.success(
        `Synced ${result.transactions_added} new transaction(s)!`,
        { duration: 5000 }
      );
      // Reload to get updated balances and sync times
      await loadData();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to sync transactions'
      );
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to remove this bank connection?')) {
      return;
    }

    try {
      await PlaidService.deleteConnection(connectionId);
      toast.success('Bank connection removed');
      await loadData();
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Failed to remove connection');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Bank Account Sync
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Connect your bank accounts and automatically sync transactions
            </p>
          </div>
          <PlaidLink onSuccess={loadData} />
        </div>
      </div>

      {/* Total Balance Card */}
      {connections.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">
                Total Bank Balance
              </p>
              <p className="text-4xl font-bold mt-2">{formatCurrency(totalBalance)}</p>
              <p className="text-blue-100 text-sm mt-2">
                Across {connections.length} connected institution(s)
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8" />
            </div>
          </div>
        </div>
      )}

      {/* Connections List */}
      {connections.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <Building2 className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Banks Connected
            </h2>

            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
              Connect your bank account to automatically import transactions and track
              your balance in real-time.
            </p>

            <PlaidLink onSuccess={loadData} />

            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-lg mx-auto mt-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Secure & Read-Only Access
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    We use Plaid to securely connect to your bank with read-only
                    access. We can never move money or access your login credentials.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              onSync={handleSync}
              onDelete={handleDelete}
              isSyncing={syncing === connection.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
