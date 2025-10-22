import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { useChapter } from '../context/ChapterContext';
import { RecurringService } from '../services/recurringService';
import { PlaidService } from '../services/plaidService';
import { RecurringTransaction } from '../services/types';
import { isDemoModeEnabled } from '../utils/env';
import { demoStore } from '../demo/demoStore';
import CashFlowForecastCard from './CashFlowForecastCard';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import InsightsCard from './InsightsCard';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface TrendPoint {
  date: string;
  net: number;
}

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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

  const [bankBalance, setBankBalance] = useState<number>(isInDemoMode ? computeDemoBalance() : 0);
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
        if (isInDemoMode) {
          setBankBalance(computeDemoBalance(currentChapter.id));
        } else {
          const balance = await PlaidService.getTotalBankBalance(currentChapter.id);
          setBankBalance(balance);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoadingBankBalance(false);
      }
    };

    loadData();
  }, [currentChapter?.id, isInDemoMode]);

  const netTrend = useMemo<TrendPoint[]>(() => {
    const bucket = new Map<string, number>();

    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      bucket.set(key, (bucket.get(key) || 0) + tx.amount);
    });

    const sorted = Array.from(bucket.entries())
      .map(([key, value]) => {
        const [year, month, day] = key.split('-').map(Number);
        const date = new Date(year, month, day);
        return { date, value };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = 0;
    return sorted.map(({ date, value }) => {
      running += value;
      return {
        date: formatDateLabel(date),
        net: Number(running.toFixed(2))
      };
    });
  }, [transactions]);

  const displayedBankBalance = isInDemoMode ? totalBalance : bankBalance;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Financial Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor your chapter's financial health</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Bank Balance Card */}
        <div
          onClick={() => navigate(getRoute('/plaid-sync'))}
          className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-primary-200/60 dark:hover:border-primary-600/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(getRoute('/plaid-sync'));
            }
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Bank<br />Balance
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
                {formatCurrency(displayedBankBalance)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Connected bank accounts
              </p>
            </>
          )}
        </div>

        {/* Total Balance Card */}
        <div className="surface-card group p-6">
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

        {/* Net Balance Card */}
        <div className="surface-card group p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Net Balance</h2>
            <div className={`w-10 h-10 ${
              totalBalance - totalDues >= 0
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-amber-100 text-amber-600'
            } rounded-lg flex items-center justify-center`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={
                  totalBalance - totalDues >= 0
                    ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                } />
              </svg>
            </div>
          </div>
          <p className={`text-3xl lg:text-4xl font-bold ${
            totalBalance - totalDues >= 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            {formatCurrency(totalBalance - totalDues)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Available after dues
          </p>
        </div>

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
      </div>

      {/* Cash Flow Forecast */}
      <CashFlowForecastCard />
      
      {/* Quick Actions Section */}
      {netTrend.length > 1 && (
        <div className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Balance trend</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Running net of all transactions this period.
              </p>
            </div>
            <span className="surface-pill">Last {netTrend.length} days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netTrend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(val) => `$${val}`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: '#cbd5f5', strokeWidth: 1 }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelClassName="text-sm font-medium text-slate-600"
                  contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.35)', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#netGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions Card */}
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center mr-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <button
              onClick={() => navigate(getRoute('/transactions'))}
              className="group w-full rounded-lg border border-sky-200 bg-sky-50 py-3 px-4 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100 focus-ring dark:border-sky-700/40 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View Transactions
            </button>
            <button
              onClick={() => navigate(getRoute('/budgets'))}
              className="group w-full rounded-lg border border-emerald-200 bg-emerald-50 py-3 px-4 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus-ring dark:border-emerald-700/40 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Manage Budgets
            </button>
            <button
              onClick={() => navigate(getRoute('/reports'))}
              className="group w-full rounded-lg border border-violet-200 bg-violet-50 py-3 px-4 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 focus-ring dark:border-violet-700/40 dark:bg-slate-800 dark:text-violet-300 dark:hover:bg-slate-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6" />
              </svg>
              View Reports
            </button>
            <button
              onClick={() => navigate(getRoute('/dues'))}
              className="group w-full rounded-lg border border-amber-200 bg-amber-50 py-3 px-4 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 focus-ring dark:border-amber-700/40 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manage Members
            </button>
          </div>
        </div>

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
      </div>

      {/* AI Insights */}
      <InsightsCard />
    </div>
  );
}; 
