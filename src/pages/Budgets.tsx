import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Budget } from '../services/types';
import { BudgetService } from '../services/budgetService';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface BudgetSuggestion {
  category: string;
  suggestedAmount: number;
  reasoning: string;
  confidence: number;
}

export const Budgets: React.FC = () => {
  const { budgets, transactions, addBudget } = useFinancial();
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<BudgetSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBudget, setNewBudget] = useState({
    name: '',
    amount: '',
    category: '',
    period: 'QUARTERLY' as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    startDate: new Date().toISOString().split('T')[0]
  });

  // Get current quarter
  const getCurrentQuarter = () => {
    const month = new Date().getMonth();
    return `Q${Math.floor(month / 3) + 1}`;
  };

  // Calculate budget progress
  const calculateBudgetProgress = (budget: Budget) => {
    const progress = (budget.spent / budget.amount) * 100;
    return {
      percentage: Math.min(progress, 100),
      remaining: budget.amount - budget.spent,
      isOverBudget: budget.spent > budget.amount
    };
  };

  // Handle budget creation
  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const budget = BudgetService.createBudget(
      newBudget.name,
      parseFloat(newBudget.amount),
      newBudget.category,
      newBudget.period,
      new Date(newBudget.startDate)
    );
    addBudget(budget);
    setShowCreateForm(false);
    setNewBudget({
      name: '',
      amount: '',
      category: '',
      period: 'QUARTERLY',
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  // Simulate AI suggestions (replace with actual API call)
  const getAISuggestions = async () => {
    setIsLoading(true);
    // This would be replaced with actual API call
    const mockSuggestions: BudgetSuggestion[] = [
      {
        category: 'Social Events',
        suggestedAmount: 5000,
        reasoning: 'Based on historical spending patterns and upcoming events',
        confidence: 0.85
      },
      {
        category: 'Operations',
        suggestedAmount: 3000,
        reasoning: 'Regular operational costs and maintenance',
        confidence: 0.92
      },
      {
        category: 'Professional Development',
        suggestedAmount: 2000,
        reasoning: 'Member training and development needs',
        confidence: 0.78
      }
    ];
    
    setTimeout(() => {
      setAISuggestions(mockSuggestions);
      setIsLoading(false);
    }, 1000);
  };

  // Apply AI suggestions to budgets
  const applyAISuggestions = () => {
    // This would update the actual budgets in the context
    console.log('Applying AI suggestions:', aiSuggestions);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Budget Management</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            {showCreateForm ? 'Cancel' : 'Create Budget'}
          </button>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Q1">Q1 (Jan-Mar)</option>
            <option value="Q2">Q2 (Apr-Jun)</option>
            <option value="Q3">Q3 (Jul-Sep)</option>
            <option value="Q4">Q4 (Oct-Dec)</option>
          </select>
          <button
            onClick={() => {
              setShowAISuggestions(!showAISuggestions);
              if (!showAISuggestions) {
                getAISuggestions();
              }
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            {showAISuggestions ? 'Hide AI Suggestions' : 'Get AI Suggestions'}
          </button>
        </div>
      </div>

      {/* Create Budget Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Budget</h2>
          <form onSubmit={handleCreateBudget} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newBudget.name}
                  onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Period</label>
                <select
                  value={newBudget.period}
                  onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value as 'MONTHLY' | 'QUARTERLY' | 'YEARLY' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={newBudget.startDate}
                  onChange={(e) => setNewBudget({ ...newBudget, startDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI Suggestions Panel */}
      {showAISuggestions && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">AI Budget Suggestions</h2>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Analyzing spending patterns...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{suggestion.category}</h3>
                        <p className="text-gray-600 mt-1">{suggestion.reasoning}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(suggestion.suggestedAmount)}</p>
                        <p className="text-sm text-gray-500">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={applyAISuggestions}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Apply Suggestions
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Total Budget</h2>
          <p className="text-3xl font-bold text-blue-600">
            {formatCurrency(budgets.reduce((sum, b) => sum + b.amount, 0))}
          </p>
          <p className="text-sm text-gray-500 mt-2">Quarterly allocation</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Total Spent</h2>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(budgets.reduce((sum, b) => sum + b.spent, 0))}
          </p>
          <p className="text-sm text-gray-500 mt-2">Current quarter</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Remaining</h2>
          <p className="text-3xl font-bold text-purple-600">
            {formatCurrency(
              budgets.reduce((sum, b) => sum + (b.amount - b.spent), 0)
            )}
          </p>
          <p className="text-sm text-gray-500 mt-2">Available funds</p>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {budgets.map((budget) => {
              const progress = calculateBudgetProgress(budget);
              return (
                <tr key={budget.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {budget.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(budget.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(budget.spent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(progress.remaining)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          progress.isOverBudget
                            ? 'bg-red-600'
                            : progress.percentage > 80
                            ? 'bg-yellow-500'
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {Math.round(progress.percentage)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 