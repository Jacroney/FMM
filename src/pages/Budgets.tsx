import React, { useState, useEffect } from 'react';
import {
  BudgetService,
  BudgetSummary,
  BudgetPeriod,
  BudgetCategory
} from '../services/budgetService';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Edit2,
  Plus,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Calendar,
  PieChart
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ExpenseModal from '../components/ExpenseModal';
import BudgetCharts from '../components/BudgetCharts';

const Budgets: React.FC = () => {
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary[]>([]);
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Fixed Costs', 'Operational Costs', 'Event Costs']));
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<BudgetPeriod | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadBudgetSummary();
    }
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [periodsData, categoriesData, currentPeriod] = await Promise.all([
        BudgetService.getBudgetPeriods(),
        BudgetService.getBudgetCategories(),
        BudgetService.getCurrentPeriod()
      ]);

      setPeriods(periodsData);
      setCategories(categoriesData);

      if (currentPeriod) {
        setSelectedPeriod(currentPeriod.name);
        setCurrentPeriod(currentPeriod);
      } else if (periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].name);
        setCurrentPeriod(periodsData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetSummary = async () => {
    try {
      const data = await BudgetService.getBudgetSummary(selectedPeriod);
      setBudgetSummary(data);
    } catch (error) {
      console.error('Error loading budget summary:', error);
    }
  };

  const handleAddExpense = async (expense: any) => {
    try {
      await BudgetService.addExpense(expense);
      await loadBudgetSummary();
      setShowExpenseModal(false);
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleUpdateBudget = async (categoryName: string, newAmount: number) => {
    try {
      const category = categories.find(c => c.name === categoryName);
      const period = periods.find(p => p.name === selectedPeriod);

      if (category && period) {
        await BudgetService.updateBudgetAllocation(category.id, period.id, newAmount);
        await loadBudgetSummary();
        setEditingBudget(null);
      }
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const toggleCategory = (categoryType: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryType)) {
      newExpanded.delete(categoryType);
    } else {
      newExpanded.add(categoryType);
    }
    setExpandedCategories(newExpanded);
  };

  const getProgressColor = (percent: number) => {
    if (percent > 100) return 'bg-red-500';
    if (percent > 80) return 'bg-yellow-500';
    if (percent > 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percent: number) => {
    if (percent > 100) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (percent > 80) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateCategoryTotals = (categoryType: string) => {
    const items = budgetSummary.filter(b => b.category_type === categoryType);
    return {
      allocated: items.reduce((sum, b) => sum + b.allocated, 0),
      spent: items.reduce((sum, b) => sum + b.spent, 0),
      remaining: items.reduce((sum, b) => sum + b.remaining, 0),
      count: items.length
    };
  };

  const grandTotals = {
    allocated: budgetSummary.reduce((sum, b) => sum + b.allocated, 0),
    spent: budgetSummary.reduce((sum, b) => sum + b.spent, 0),
    remaining: budgetSummary.reduce((sum, b) => sum + b.remaining, 0)
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Budget Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage your fraternity finances</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              const period = periods.find(p => p.name === e.target.value);
              if (period) setCurrentPeriod(period);
            }}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {periods.map(period => (
              <option key={period.id} value={period.name}>
                {period.name} {period.fiscal_year}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(grandTotals.allocated)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(grandTotals.spent)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
              <p className={`text-2xl font-bold ${grandTotals.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(grandTotals.remaining)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Utilization</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {grandTotals.allocated > 0
                  ? Math.round((grandTotals.spent / grandTotals.allocated) * 100)
                  : 0}%
              </p>
            </div>
            <PieChart className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Budget Charts */}
      {budgetSummary.length > 0 && (
        <div className="mb-6">
          <BudgetCharts budgetSummary={budgetSummary} />
        </div>
      )}

      {/* Budget Categories */}
      {['Fixed Costs', 'Operational Costs', 'Event Costs'].map(categoryType => {
        const totals = calculateCategoryTotals(categoryType);
        const categoryBudgets = budgetSummary.filter(b => b.category_type === categoryType);
        const isExpanded = expandedCategories.has(categoryType);

        return (
          <div key={categoryType} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            {/* Category Header */}
            <div
              className="p-6 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
              onClick={() => toggleCategory(categoryType)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {categoryType}
                  </h2>
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                    {totals.count} items
                  </span>
                </div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Allocated:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(totals.allocated)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Spent:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(totals.spent)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Remaining:</span>
                    <span className={`ml-2 font-semibold ${totals.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.remaining)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Items */}
            {isExpanded && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {categoryBudgets.map((budget) => (
                  <div key={`${budget.category}-${budget.period}`} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{budget.category}</h3>
                          {getStatusIcon(budget.percent_used)}
                        </div>

                        <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span>Allocated: {formatCurrency(budget.allocated)}</span>
                          <span>Spent: {formatCurrency(budget.spent)}</span>
                          <span className={budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                            Remaining: {formatCurrency(budget.remaining)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`${getProgressColor(budget.percent_used)} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(budget.percent_used, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-6">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {Math.round(budget.percent_used)}%
                        </span>

                        {editingBudget === `${budget.category}-${budget.period}` ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateBudget(budget.category, editValue)}
                              className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingBudget(null)}
                              className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingBudget(`${budget.category}-${budget.period}`);
                              setEditValue(budget.allocated);
                            }}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleAddExpense}
        categories={categories}
        currentPeriod={currentPeriod}
      />
    </div>
  );
};

export default Budgets;