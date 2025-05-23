import React from 'react';
import { useFinancial } from '../context/FinancialContext';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const Dashboard: React.FC = () => {
  const { totalBalance, totalDues } = useFinancial();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Financial Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Balance Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Total Balance</h2>
          <p className={`text-4xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Current available funds
          </p>
        </div>

        {/* Total Dues Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Total Dues</h2>
          <p className="text-4xl font-bold text-blue-600">
            {formatCurrency(totalDues)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Total budgeted amount
          </p>
        </div>

        {/* Remaining Balance Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Remaining Balance</h2>
          <p className={`text-4xl font-bold ${totalBalance - totalDues >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalBalance - totalDues)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Available after dues
          </p>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
              Add Transaction
            </button>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors">
              Create Budget
            </button>
            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors">
              Import CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 