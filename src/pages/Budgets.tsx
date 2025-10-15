import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ExpenseService } from '../services/expenseService';
import {
  BudgetSummary,
  BudgetPeriod,
  BudgetCategory,
  ExpenseDetail
} from '../services/types';
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
  PieChart,
  Receipt,
  List
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { BudgetCardSkeleton, BudgetCategorySkeleton, ChartSkeleton } from '../components/Skeleton';
import ExpenseModal from '../components/ExpenseModal';
import BudgetCharts from '../components/BudgetCharts';
import ExpenseList from '../components/ExpenseList';
import BudgetSetupWizard from '../components/BudgetSetupWizard';
import { useChapter } from '../context/ChapterContext';
import toast from 'react-hot-toast';

const Budgets: React.FC = () => {
  const { currentChapter } = useChapter();
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDetail[]>([]);
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Fixed Costs', 'Operational Costs', 'Event Costs']));
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<BudgetPeriod | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'expenses'>('overview');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'Operational Costs' as 'Fixed Costs' | 'Operational Costs' | 'Event Costs',
    description: ''
  });
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    type: 'Quarter' as 'Quarter' | 'Semester' | 'Year',
    start_date: '',
    end_date: '',
    fiscal_year: new Date().getFullYear(),
    is_current: false
  });

  const loadData = useCallback(async () => {
    if (!currentChapter?.id) {
      setBudgetSummary([]);
      setExpenses([]);
      setPeriods([]);
      setCategories([]);
      setCurrentPeriod(null);
      setSelectedPeriod('');
      setSelectedPeriodId('');
      setEditingBudget(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check if budget structure is initialized
      const isInitialized = await ExpenseService.isBudgetInitialized(currentChapter.id);
      if (!isInitialized) {
        setShowSetupWizard(true);
        setLoading(false);
        return;
      }

      const [periodsData, categoriesData, currentPeriodData] = await Promise.all([
        ExpenseService.getPeriods(currentChapter.id),
        ExpenseService.getCategories(currentChapter.id),
        ExpenseService.getCurrentPeriod(currentChapter.id)
      ]);

      setPeriods(periodsData);
      setCategories(categoriesData);

      if (currentPeriodData) {
        setSelectedPeriod(currentPeriodData.name);
        setSelectedPeriodId(currentPeriodData.id);
        setCurrentPeriod(currentPeriodData);
      } else if (periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].name);
        setSelectedPeriodId(periodsData[0].id);
        setCurrentPeriod(periodsData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, [currentChapter?.id]);

  const loadBudgetSummary = useCallback(async () => {
    if (!currentChapter?.id || !selectedPeriod) {
      setBudgetSummary([]);
      return;
    }

    try {
      const data = await ExpenseService.getBudgetSummary(currentChapter.id, selectedPeriod);
      setBudgetSummary(data);
    } catch (error) {
      console.error('Error loading budget summary:', error);
    }
  }, [currentChapter?.id, selectedPeriod]);

  const loadExpenses = useCallback(async () => {
    if (!currentChapter?.id || !selectedPeriodId) {
      setExpenses([]);
      return;
    }

    try {
      const data = await ExpenseService.getExpenses(currentChapter.id, {
        periodId: selectedPeriodId
      });
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  }, [currentChapter?.id, selectedPeriodId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedPeriod) {
      loadBudgetSummary();
    }
  }, [loadBudgetSummary, selectedPeriod]);

  useEffect(() => {
    if (selectedPeriodId) {
      loadExpenses();
    }
  }, [loadExpenses, selectedPeriodId]);

  const handleExpenseSubmitted = async () => {
    // Reload both budget summary and expenses list
    await Promise.all([
      loadBudgetSummary(),
      loadExpenses()
    ]);
  };

  const handleSetupComplete = async () => {
    setShowSetupWizard(false);
    await loadData();
  };

  const handleCreateCategory = async () => {
    if (!currentChapter?.id || !newCategory.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      await ExpenseService.addCategory(currentChapter.id, {
        name: newCategory.name.trim(),
        type: newCategory.type,
        description: newCategory.description.trim() || null,
        is_active: true
      });

      toast.success('Category created successfully');
      setShowCategoryModal(false);
      setNewCategory({ name: '', type: 'Operational Costs', description: '' });
      await loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleCreatePeriod = async () => {
    if (!currentChapter?.id || !newPeriod.name.trim() || !newPeriod.start_date || !newPeriod.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await ExpenseService.addPeriod(currentChapter.id, {
        name: newPeriod.name.trim(),
        type: newPeriod.type,
        start_date: newPeriod.start_date,
        end_date: newPeriod.end_date,
        fiscal_year: newPeriod.fiscal_year,
        is_current: newPeriod.is_current
      });

      toast.success('Budget period created successfully');
      setShowPeriodModal(false);
      setNewPeriod({
        name: '',
        type: 'Quarter',
        start_date: '',
        end_date: '',
        fiscal_year: new Date().getFullYear(),
        is_current: false
      });
      await loadData();
    } catch (error) {
      console.error('Error creating period:', error);
      toast.error('Failed to create budget period');
    }
  };

  const handleUpdateBudget = async (categoryName: string, newAmount: number) => {
    if (!currentChapter?.id) return;
    try {
      const category = categories.find(c => c.name === categoryName);
      const period = periods.find(p => p.name === selectedPeriod);

      if (category && period) {
        // Use the budgetService for budget allocations (will need to import it or create function in ExpenseService)
        const { BudgetService } = await import('../services/budgetService');
        await BudgetService.updateBudgetAllocation(currentChapter.id, category.id, period.id, newAmount);
        await loadBudgetSummary();
        setEditingBudget(null);
        toast.success('Budget updated successfully');
      }
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
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

  // Memoize expensive calculations
  const calculateCategoryTotals = useCallback((categoryType: string) => {
    const items = budgetSummary.filter(b => b.category_type === categoryType);
    return {
      allocated: items.reduce((sum, b) => sum + b.allocated, 0),
      spent: items.reduce((sum, b) => sum + b.spent, 0),
      remaining: items.reduce((sum, b) => sum + b.remaining, 0),
      count: items.length
    };
  }, [budgetSummary]);

  const grandTotals = useMemo(() => ({
    allocated: budgetSummary.reduce((sum, b) => sum + b.allocated, 0),
    spent: budgetSummary.reduce((sum, b) => sum + b.spent, 0),
    remaining: budgetSummary.reduce((sum, b) => sum + b.remaining, 0)
  }), [budgetSummary]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <BudgetCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>

        {/* Category Skeletons */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <BudgetCategorySkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Show setup wizard if budget is not initialized
  if (showSetupWizard && currentChapter?.id) {
    return <BudgetSetupWizard chapterId={currentChapter.id} onComplete={handleSetupComplete} />;
  }

  // Show empty state if no chapter selected
  if (!currentChapter?.id) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Please select a chapter to view budgets
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Budget & Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track budgets and manage all expenses</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!currentChapter?.id}
            title="Add new budget category"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
          <button
            onClick={() => setShowPeriodModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!currentChapter?.id}
            title="Add new budget period"
          >
            <Calendar className="w-4 h-4" />
            Add Period
          </button>
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              const period = periods.find(p => p.name === e.target.value);
              if (period) {
                setCurrentPeriod(period);
                setSelectedPeriodId(period.id);
              }
            }}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
          >
            {periods.map(period => (
              <option key={period.id} value={period.name}>
                {period.name} {period.fiscal_year}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!currentChapter?.id}
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1 inline-flex gap-1">
        <button
          onClick={() => setViewMode('overview')}
          className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
            viewMode === 'overview'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Budget Overview
        </button>
        <button
          onClick={() => setViewMode('expenses')}
          className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
            viewMode === 'expenses'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <List className="w-4 h-4" />
          All Expenses ({expenses.length})
        </button>
      </div>

      {/* Budget Overview View */}
      {viewMode === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Allocated Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-blue-200/50 dark:border-blue-700/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Allocated</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(grandTotals.allocated)}
              </p>
            </div>
            <div className="flex-shrink-0 w-12 h-12 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-red-200/50 dark:border-red-700/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {formatCurrency(grandTotals.spent)}
              </p>
            </div>
            <div className="flex-shrink-0 w-12 h-12 bg-red-500 dark:bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Remaining Card */}
        <div className={`relative overflow-hidden p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${
          grandTotals.remaining >= 0
            ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200/50 dark:border-green-700/50'
            : 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200/50 dark:border-orange-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${
                grandTotals.remaining >= 0
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-orange-700 dark:text-orange-300'
              }`}>
                Remaining
              </p>
              <p className={`text-2xl font-bold ${
                grandTotals.remaining >= 0
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-orange-900 dark:text-orange-100'
              }`}>
                {formatCurrency(grandTotals.remaining)}
              </p>
            </div>
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center shadow-lg ${
              grandTotals.remaining >= 0
                ? 'bg-green-500 dark:bg-green-600'
                : 'bg-orange-500 dark:bg-orange-600'
            }`}>
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Utilization Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-purple-200/50 dark:border-purple-700/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Utilization</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {grandTotals.allocated > 0
                  ? Math.round((grandTotals.spent / grandTotals.allocated) * 100)
                  : 0}%
              </p>
              {grandTotals.allocated > 0 && (
                <div className="mt-2 w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5">
                  <div
                    className="bg-purple-600 dark:bg-purple-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((grandTotals.spent / grandTotals.allocated) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500 dark:bg-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <PieChart className="w-6 h-6 text-white" />
            </div>
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
        const utilizationPercent = totals.allocated > 0 ? (totals.spent / totals.allocated) * 100 : 0;

        return (
          <div key={categoryType} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
            {/* Category Header */}
            <div
              className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              onClick={() => toggleCategory(categoryType)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                    <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {categoryType}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {totals.count} {totals.count === 1 ? 'category' : 'categories'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Allocated</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.allocated)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Spent</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.spent)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Remaining</p>
                    <p className={`font-semibold ${totals.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(totals.remaining)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      utilizationPercent > 100 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      utilizationPercent > 80 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                      'bg-gradient-to-r from-green-500 to-green-600'
                    }`}
                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{Math.round(utilizationPercent)}% utilized</span>
                  {utilizationPercent > 100 && (
                    <span className="text-red-600 dark:text-red-400 font-medium">Over budget by {Math.round(utilizationPercent - 100)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Category Items */}
            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-900/50">
                {categoryBudgets.map((budget, index) => (
                  <div
                    key={`${budget.category}-${budget.period}`}
                    className="p-6 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
                    style={{
                      transitionDelay: isExpanded ? `${index * 50}ms` : '0ms'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{budget.category}</h3>
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            budget.percent_used > 100 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                            budget.percent_used > 80 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          }`}>
                            {getStatusIcon(budget.percent_used)}
                            <span>{Math.round(budget.percent_used)}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Allocated</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(budget.allocated)}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Spent</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(budget.spent)}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
                            <p className={`font-semibold ${budget.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(budget.remaining)}
                            </p>
                          </div>
                        </div>

                        {/* Enhanced Progress Bar */}
                        <div className="relative">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${
                                budget.percent_used > 100 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                budget.percent_used > 80 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                budget.percent_used > 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                'bg-gradient-to-r from-green-500 to-green-600'
                              } shadow-sm`}
                              style={{ width: `${Math.min(budget.percent_used, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-6">
                        {editingBudget === `${budget.category}-${budget.period}` ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">$</span>
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(Number(e.target.value))}
                                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                autoFocus
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateBudget(budget.category, editValue)}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingBudget(null)}
                                className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingBudget(`${budget.category}-${budget.period}`);
                              setEditValue(budget.allocated);
                            }}
                            className="p-3 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Edit budget allocation"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
        </>
      )}

      {/* Expenses List View */}
      {viewMode === 'expenses' && (
        <ExpenseList
          expenses={expenses}
          onExpenseUpdated={handleExpenseSubmitted}
          onExpenseDeleted={handleExpenseSubmitted}
          showCategoryColumn={true}
          showPeriodColumn={false}
          showActions={true}
          categories={categories}
          currentPeriod={currentPeriod}
          chapterId={currentChapter?.id || null}
        />
      )}

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleExpenseSubmitted}
        categories={categories}
        currentPeriod={currentPeriod}
        chapterId={currentChapter?.id || null}
      />

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Budget Category</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., House Maintenance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Type *
                </label>
                <select
                  value={newCategory.type}
                  onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
                >
                  <option value="Fixed Costs">Fixed Costs</option>
                  <option value="Operational Costs">Operational Costs</option>
                  <option value="Event Costs">Event Costs</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Describe this category..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategory({ name: '', type: 'Operational Costs', description: '' });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Period Modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Budget Period</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Period Name *
                </label>
                <input
                  type="text"
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Fall Quarter, Spring Semester"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Period Type *
                </label>
                <select
                  value={newPeriod.type}
                  onChange={(e) => setNewPeriod({ ...newPeriod, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
                >
                  <option value="Quarter">Quarter</option>
                  <option value="Semester">Semester</option>
                  <option value="Year">Year</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={newPeriod.start_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={newPeriod.end_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fiscal Year *
                </label>
                <input
                  type="number"
                  value={newPeriod.fiscal_year}
                  onChange={(e) => setNewPeriod({ ...newPeriod, fiscal_year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  min={2020}
                  max={2050}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={newPeriod.is_current}
                    onChange={(e) => setNewPeriod({ ...newPeriod, is_current: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Set as current period
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPeriodModal(false);
                  setNewPeriod({
                    name: '',
                    type: 'Quarter',
                    start_date: '',
                    end_date: '',
                    fiscal_year: new Date().getFullYear(),
                    is_current: false
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePeriod}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Period
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
