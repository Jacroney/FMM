import React, { useState, useEffect } from 'react';
import { PlaidLink } from '../components/PlaidLink';
import { PlaidService, PlaidConnection } from '../services/plaidService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Database,
  AlertCircle,
} from 'lucide-react';

export function PlaidSync() {
  const { userProfile } = useAuth();
  const [connections, setConnections] = useState<PlaidConnection[]>([]);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [unprocessedCount, setUnprocessedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const loadData = async () => {
    console.log('PlaidSync loadData - userProfile:', userProfile);

    if (!userProfile?.chapter_id) {
      console.log('No chapter_id found, setting loading to false');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading Plaid data for chapter:', userProfile.chapter_id);

      const [connectionsData, historyData, unprocessedData] = await Promise.all([
        PlaidService.getConnections(userProfile.chapter_id),
        PlaidService.getSyncHistory(userProfile.chapter_id, 10),
        PlaidService.getUnprocessedStaging(userProfile.chapter_id),
      ]);

      console.log('Plaid data loaded:', { connectionsData, historyData, unprocessedData });

      setConnections(connectionsData);
      setSyncHistory(historyData);
      setUnprocessedCount(unprocessedData.length);
    } catch (error) {
      console.error('Error loading Plaid data:', error);
      toast.error('Failed to load connection data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userProfile?.chapter_id]);

  const handleSync = async (connectionId: string) => {
    if (!userProfile?.chapter_id) return;

    try {
      setSyncing(connectionId);
      toast.loading('Syncing transactions...');

      const result = await PlaidService.syncTransactions(
        connectionId,
        userProfile.chapter_id
      );

      toast.dismiss();

      if (result.success) {
        toast.success(`Synced ${result.added} new transactions`);

        // Auto-reconcile if there are new transactions
        if (result.added > 0) {
          toast.loading('Processing transactions...');
          const reconcileResult = await PlaidService.reconcile(
            userProfile.chapter_id,
            'plaid_txn_staging'
          );
          toast.dismiss();

          if (reconcileResult?.success) {
            toast.success(
              `Processed ${reconcileResult.records_inserted} transactions`
            );
          }
        }

        await loadData();
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to sync transactions');
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    if (!userProfile?.chapter_id) return;

    try {
      setSyncing('all');
      toast.loading('Syncing all connections...');

      await PlaidService.syncAll(userProfile.chapter_id);
      toast.dismiss();
      toast.success('All connections synced successfully');

      // Reconcile all staging data
      toast.loading('Processing transactions...');
      const reconcileResult = await PlaidService.reconcile(
        userProfile.chapter_id,
        'plaid_txn_staging'
      );
      toast.dismiss();

      if (reconcileResult?.success) {
        toast.success(`Processed ${reconcileResult.records_inserted} transactions`);
      }

      await loadData();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to sync connections');
    } finally {
      setSyncing(null);
    }
  };

  const handleDeactivate = async (connectionId: string) => {
    if (!userProfile?.chapter_id) return;
    if (!confirm('Are you sure you want to disconnect this bank account?')) return;

    try {
      await PlaidService.deactivateConnection(connectionId, userProfile.chapter_id);
      toast.success('Bank account disconnected');
      await loadData();
    } catch (error) {
      toast.error('Failed to disconnect bank account');
    }
  };

  const handleReconcileStaging = async () => {
    if (!userProfile?.chapter_id) return;

    try {
      toast.loading('Processing staged transactions...');
      const result = await PlaidService.reconcile(
        userProfile.chapter_id,
        'plaid_txn_staging'
      );
      toast.dismiss();

      if (result?.success) {
        toast.success(
          `Processed ${result.records_inserted} transactions, skipped ${result.records_skipped} duplicates`
        );
        await loadData();
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to reconcile staging data');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bank Account Sync
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Connect your bank accounts and automatically sync transactions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Connected Accounts
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {connections.filter((c) => c.is_active).length}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Unprocessed Transactions
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {unprocessedCount}
              </p>
            </div>
            <Database className="h-12 w-12 text-yellow-600" />
          </div>
          {unprocessedCount > 0 && (
            <button
              onClick={handleReconcileStaging}
              className="mt-4 w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
            >
              Process Now
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Recent Syncs
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {syncHistory.length}
              </p>
            </div>
            <Clock className="h-12 w-12 text-green-600" />
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Connected Accounts
            </h2>
            <div className="flex gap-3">
              {connections.some((c) => c.is_active) && (
                <button
                  onClick={handleSyncAll}
                  disabled={syncing === 'all'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${syncing === 'all' ? 'animate-spin' : ''}`}
                  />
                  Sync All
                </button>
              )}
              <PlaidLink
                chapterId={userProfile?.chapter_id || ''}
                onSuccess={() => loadData()}
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {connections.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                No bank accounts connected yet
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Connect your first account to start syncing transactions
              </p>
            </div>
          ) : (
            connections.map((connection) => (
              <div key={connection.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {connection.institution_name || 'Unknown Bank'}
                      </h3>
                      {connection.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Last synced: {formatDate(connection.last_synced_at)}
                    </p>
                    {connection.error_message && (
                      <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>{connection.error_message}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {connection.is_active && (
                      <button
                        onClick={() => handleSync(connection.id)}
                        disabled={syncing === connection.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Sync now"
                      >
                        <RefreshCw
                          className={`h-5 w-5 ${
                            syncing === connection.id ? 'animate-spin' : ''
                          }`}
                        />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeactivate(connection.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Disconnect"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sync History
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Institution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Started At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Modified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {syncHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No sync history yet
                  </td>
                </tr>
              ) : (
                syncHistory.map((sync) => (
                  <tr key={sync.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {sync.plaid_connections?.institution_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(sync.started_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {sync.transactions_added}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {sync.transactions_modified}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sync.sync_status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </span>
                      ) : sync.sync_status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          <Clock className="h-3 w-3" />
                          Running
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
