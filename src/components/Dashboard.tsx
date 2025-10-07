import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { totalBalance, totalDues, transactions } = useFinancial();

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Financial Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor your chapter's financial health</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Balance Card */}
        <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-200/60 dark:hover:border-blue-600/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Balance</h2>
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
        <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-200/60 dark:hover:border-blue-600/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Dues</h2>
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totalDues)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Total budgeted amount
          </p>
        </div>

        {/* Net Balance Card */}
        <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-200/60 dark:hover:border-blue-600/60">
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
      </div>
      
      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
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
              onClick={() => navigate('/transactions')}
              className="group w-full rounded-lg border border-sky-200 bg-sky-50 py-3 px-4 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-700/40 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View Transactions
            </button>
            <button
              onClick={() => navigate('/budgets')}
              className="group w-full rounded-lg border border-emerald-200 bg-emerald-50 py-3 px-4 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Manage Budgets
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="group w-full rounded-lg border border-violet-200 bg-violet-50 py-3 px-4 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-700/40 dark:bg-slate-800 dark:text-violet-300 dark:hover:bg-slate-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v7m3-2h6" />
              </svg>
              View Reports
            </button>
            <button
              onClick={() => navigate('/members')}
              className="group w-full rounded-lg border border-amber-200 bg-amber-50 py-3 px-4 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700/40 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manage Members
            </button>
          </div>
        </div>

        {/* Recent Activity Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
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
    </div>
  );
}; 
