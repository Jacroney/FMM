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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Financial Overview</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Balance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300">Total Balance</h2>
            <span className="text-2xl">💰</span>
          </div>
          <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${
            totalBalance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
            Current available funds
          </p>
        </div>

        {/* Total Dues Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300">Total Dues</h2>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600">
            {formatCurrency(totalDues)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
            Total budgeted amount
          </p>
        </div>

        {/* Net Balance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300">Net Balance</h2>
            <span className="text-2xl">{totalBalance - totalDues >= 0 ? '✅' : '⚠️'}</span>
          </div>
          <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${
            totalBalance - totalDues >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(totalBalance - totalDues)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
            Available after dues
          </p>
        </div>
      </div>
      
      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Actions Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="mr-2">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <button 
              onClick={() => navigate('/transactions')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base flex items-center justify-center"
            >
              <span className="mr-2">➕</span>
              View Transactions
            </button>
            <button 
              onClick={() => navigate('/budgets')}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base flex items-center justify-center"
            >
              <span className="mr-2">📈</span>
              Manage Budgets
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base flex items-center justify-center"
            >
              <span className="mr-2">📊</span>
              View Reports
            </button>
            <button 
              onClick={() => navigate('/members')}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors text-sm sm:text-base flex items-center justify-center"
            >
              <span className="mr-2">👥</span>
              Manage Members
            </button>
          </div>
        </div>

        {/* Recent Activity Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="mr-2">📋</span>
            Recent Activity
          </h2>
          <div className="space-y-3">
            {transactions.slice(0, 3).map((transaction, idx) => (
              <div key={transaction.id || idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-sm font-medium ${
                  transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                No recent transactions
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 