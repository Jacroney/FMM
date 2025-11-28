import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { useChapter } from '../context/ChapterContext';
import { RecurringService } from '../services/recurringService';
import { PlaidService } from '../services/plaidService';
import { RecurringTransaction } from '../services/types';
import { isDemoModeEnabled } from '../utils/env';
import { demoStore } from '../demo/demoStore';
import InsightsCard from './InsightsCard';
import TodaysTransactionsTable from './TodaysTransactionsTable';
import BudgetHealthCard from './BudgetHealthCard';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalBalance, totalDues, transactions } = useFinancial();
  const { currentChapter } = useChapter();
  const [nextRecurring, setNextRecurring] = useState<RecurringTransaction | null>(null);
  
  // Check if we're in demo mode based on current URL
  const isInDemoMode = location.pathname.startsWith('/demo');
  
  const computeDemoBalance = (chapterId?: string) => {
    const allConnections = demoStore.getState().plaidConnections;
    const filteredConnections = allConnections.filter(conn => !chapterId || conn.chapter_id === chapterId);
    const balance = filteredConnections.reduce((sum, conn) => sum + (conn.total_balance || 0), 0);
    return balance;
  };

  // Helper function to get the correct route based on demo mode
  const getRoute = (path: string) => {
    return isInDemoMode ? `/demo${path}` : `/app${path}`;
  };

  const [bankBalance, setBankBalance] = useState<number>(() => {
    if (isInDemoMode) {
      return computeDemoBalance();
    }
    return 0;
  });
  const [loadingBankBalance, setLoadingBankBalance] = useState(true);


  // Handle demo mode initialization separately to ensure data loads properly
  useEffect(() => {
    if (isInDemoMode) {
      // In demo mode, ensure we have the correct balance immediately
      const chapterId = currentChapter?.id || '00000000-0000-0000-0000-000000000001';
      setBankBalance(computeDemoBalance(chapterId));
      setLoadingBankBalance(false);
      
      // Also load the next recurring transaction immediately
      const loadNextRecurring = async () => {
        try {
          // Small delay to ensure demo store is fully initialized
          await new Promise(resolve => setTimeout(resolve, 100));
          const next = await RecurringService.getNextRecurring(chapterId);
          setNextRecurring(next);
        } catch (error) {
          console.error('Error loading next recurring in demo mode:', error);
        }
      };
      loadNextRecurring();
    }
  }, [isInDemoMode, currentChapter?.id]);

  useEffect(() => {
    // Scroll to top when component mounts, especially for demo mode
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const loadData = async () => {
      // In demo mode, we can proceed even without currentChapter.id
      // as the demo data is available globally
      if (!isInDemoMode && !currentChapter?.id) return;

      try {
        // Load next recurring transaction (only for non-demo mode, demo mode handled separately)
        if (!isInDemoMode && currentChapter?.id) {
          const next = await RecurringService.getNextRecurring(currentChapter.id);
          setNextRecurring(next);
        }

        // Load bank balance from Plaid (only for non-demo mode)
        if (!isInDemoMode) {
          setLoadingBankBalance(true);
          const balance = await PlaidService.getTotalBankBalance(currentChapter.id);
          setBankBalance(balance);
          setLoadingBankBalance(false);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoadingBankBalance(false);
      }
    };

    loadData();
  }, [currentChapter?.id, isInDemoMode]);

  const displayedBankBalance = isInDemoMode ? totalBalance : bankBalance;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Financial Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor your chapter's financial health</p>
      </div>
      {/* Top row: Bank Balance (hero card - larger and more prominent) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Bank Balance Card - Hero */}
        <div
          onClick={() => navigate(getRoute('/plaid-sync'))}
          className="group bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg transition-all duration-300 p-8 border-2 border-primary-200 dark:border-primary-600/40 hover:border-primary-300 dark:hover:border-primary-500/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(getRoute('/plaid-sync'));
            }
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                Total Available Funds
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connected bank accounts
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-primary-200 text-primary-700 dark:bg-primary-600 dark:text-white flex items-center justify-center shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          {loadingBankBalance ? (
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-3 border-primary-600"></div>
              <span className="text-lg text-gray-600 dark:text-gray-300">Loading balance...</span>
            </div>
          ) : (
            <p className="text-5xl lg:text-6xl font-bold text-primary-700 dark:text-primary-300">
              {formatCurrency(displayedBankBalance)}
            </p>
          )}
        </div>
      </div>

      {/* Second row: Next Recurring + Budget Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Next Recurring Card */}
        <div
          onClick={() => navigate(getRoute('/recurring'))}
          className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-accent-200/60 dark:hover:border-accent-600/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(getRoute('/recurring'));
            }
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Next Recurring</h2>
            <div className="w-10 h-10 rounded-lg bg-accent-100 text-accent flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          {nextRecurring ? (
            <>
              <p className={`text-2xl font-bold ${
                nextRecurring.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-accent dark:text-accent-400'
              }`}>
                {formatCurrency(nextRecurring.amount)}
              </p>
              <p className="text-sm text-gray-900 dark:text-white mt-2 font-medium truncate">
                {nextRecurring.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Due {new Date(nextRecurring.next_due_date).toLocaleDateString()}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-400 dark:text-gray-600">
                None
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                No upcoming recurring
              </p>
            </>
          )}
        </div>

        {/* Budget Health Card */}
        <BudgetHealthCard />
      </div>

      {/* Today's Transactions Table */}
      <TodaysTransactionsTable />

      {/* Recent Activity Preview */}
      <div className="surface-card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          Recent Activity
        </h2>
        <div className="space-y-3">
          {transactions.slice(0, 3).map((transaction, idx) => (
            <div key={transaction.id || idx} className="group flex justify-between items-center py-3 px-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {transaction.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-sm font-semibold px-2 py-1 rounded-md ${
                transaction.amount >= 0
                  ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
                  : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
              }`}>
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                No recent transactions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <InsightsCard />
    </div>
  );
}; 
