import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { useChapter } from '../context/ChapterContext';
import { RecurringService } from '../services/recurringService';
import { PlaidService } from '../services/plaidService';
import { RecurringTransaction } from '../services/types';
import CashFlowForecastCard from './CashFlowForecastCard';
import InsightsCard from './InsightsCard';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { totalBalance, totalDues, transactions } = useFinancial();
  const { currentChapter } = useChapter();
  const [nextRecurring, setNextRecurring] = useState<RecurringTransaction | null>(null);
  const [bankBalance, setBankBalance] = useState<number>(0);
  const [loadingBankBalance, setLoadingBankBalance] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!currentChapter?.id) return;

      try {
        // Load next recurring transaction
        const next = await RecurringService.getNextRecurring(currentChapter.id);
        setNextRecurring(next);

        // Load bank balance from Plaid
        setLoadingBankBalance(true);
        const balance = await PlaidService.getTotalBankBalance(currentChapter.id);
        setBankBalance(balance);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoadingBankBalance(false);
      }
    };

    loadData();
  }, [currentChapter?.id]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Financial Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor your chapter's financial health</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Bank Balance Card */}
        <div
          onClick={() => navigate('/plaid-sync')}
          className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-primary-200/60 dark:hover:border-primary-600/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/plaid-sync');
            }
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Bank Balance
            </h2>
            <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          {loadingBankBalance ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
          ) : (
            <>
              <p className="text-3xl lg:text-4xl font-bold text-primary dark:text-primary-400">
                {formatCurrency(bankBalance)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Connected bank accounts
              </p>
            </>
          )}
        </div>

        {/* Total Balance Card */}
        <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-200/60 dark:hover:border-blue-600/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Total Balance
            </h2>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className={`text-3xl lg:text-4xl font-bold ${
            totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Current available funds
          </p>
        </div>

        {/* Total Dues Card */}
        <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-secondary-200/60 dark:hover:border-secondary-600/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Dues</h2>
            <div className="w-10 h-10 rounded-lg bg-secondary-100 text-secondary flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl lg:text-4xl font-bold text-secondary dark:text-secondary-400">
            {formatCurrency(totalDues)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Total budgeted amount
          </p>
        </div>

        {/* Next Recurring Card */}
        <div
          onClick={() => navigate('/recurring')}
          className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-accent-200/60 dark:hover:border-accent-600/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/recurring');
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
      </div>

      {/* Cash Flow Forecast */}
      <CashFlowForecastCard />

      {/* AI Insights */}
      <InsightsCard />
    </div>
  );
}; 
