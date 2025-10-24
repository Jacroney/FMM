import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
  List,
  Filter,
  Search,
  Grid3x3,
  LayoutGrid
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { BudgetCardSkeleton, BudgetCategorySkeleton, ChartSkeleton } from '../components/Skeleton';
import ExpenseModal from '../components/ExpenseModal';
import BudgetCharts from '../components/BudgetCharts';
import ExpenseList from '../components/ExpenseList';
import BudgetSetupWizard from '../components/BudgetSetupWizard';
import BudgetCard from '../components/BudgetCard';
import BudgetDetailModal from '../components/BudgetDetailModal';
import { useChapter } from '../context/ChapterContext';
import toast from 'react-hot-toast';
import { demoStore } from '../demo/demoStore';

const Budgets: React.FC = () => {
  const { chapters, currentChapter, setCurrentChapter } = useChapter();
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
  const [viewMode, setViewMode] = useState<'grid' | 'charts' | 'expenses'>('grid');

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
  const [selectedBudget, setSelectedBudget] = useState<BudgetSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'on-track' | 'warning' | 'over-budget'>('all');
  const [filterType, setFilterType] = useState<'all' | 'Fixed Costs' | 'Operational Costs' | 'Event Costs'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'spent' | 'percent'>('name');

  const location = useLocation();
  const isDemoRoute = location.pathname.startsWith('/demo');

  useEffect(() => {
    if (isDemoRoute && !currentChapter && chapters.length > 0) {
      setCurrentChapter(chapters[0]);
    }
  }, [isDemoRoute, currentChapter, chapters, setCurrentChapter]);

  // Remove the effect that forces grid view in demo mode
  // useEffect(() => {
  //   if (isDemoRoute && viewMode !== 'grid') {
  //     setViewMode('grid');
  //   }
  // }, [isDemoRoute, viewMode]);

  const loadData = useCallback(async () => {
    if (isDemoRoute) {
      const state = demoStore.getState();
      const chapterId = currentChapter?.id || state.chapter.id;

      const periodsData = state.budgetPeriods
        .filter(period => period.chapter_id === chapterId)
        .map(period => ({ ...period }));

      const categoriesData = state.budgetCategories
        .filter(category => category.chapter_id === chapterId)
        .map(category => ({ ...category }));

      const expensesData = state.expenses
        .filter(expense => expense.chapter_id === chapterId)
        .map(expense => ({ ...expense }));

      const summaryData = state.budgetSummary
        .filter(summary => summary.chapter_id === chapterId)
        .map(summary => ({ ...summary }));

      const currentPeriodData = periodsData.find(period => period.is_current) || periodsData[0] || null;

      setPeriods(periodsData);
      setCategories(categoriesData);
      setExpenses(expensesData);
      setBudgetSummary(summaryData);
      setCurrentPeriod(currentPeriodData || null);
      setSelectedPeriod(currentPeriodData?.name || (periodsData[0]?.name ?? ''));
      setSelectedPeriodId(currentPeriodData?.id || (periodsData[0]?.id ?? ''));
      setShowSetupWizard(false);
      setLoading(false);
      
      return;
    }

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

  // Filter and sort budgets
  const filteredAndSortedBudgets = useMemo(() => {
    let filtered = budgetSummary;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(budget => {
        if (filterStatus === 'over-budget') return budget.percent_used > 100;
        if (filterStatus === 'warning') return budget.percent_used > 60 && budget.percent_used <= 100;
        if (filterStatus === 'on-track') return budget.percent_used <= 60;
        return true;
      });
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(budget => budget.category_type === filterType);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(budget =>
        budget.category.toLowerCase().includes(query) ||
        budget.category_type.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.category.localeCompare(b.category);
      } else if (sortBy === 'spent') {
        return b.spent - a.spent;
      } else if (sortBy === 'percent') {
        return b.percent_used - a.percent_used;
      }
      return 0;
    });

    return sorted;
  }, [budgetSummary, filterStatus, filterType, searchQuery, sortBy]);

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
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!currentChapter?.id}
            title="Add new budget category"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
          <button
            onClick={() => setShowPeriodModal(true)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:text-white [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
          >
            {periods.map(period => (
              <option key={period.id} value={period.name}>
                {period.name} {period.fiscal_year}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!currentChapter?.id}
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-1 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              viewMode === 'grid'
                ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white font-medium'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Budget Grid
          </button>
          <button
            onClick={() => setViewMode('charts')}
            className={`px-1 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              viewMode === 'charts'
                ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white font-medium'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setViewMode('expenses')}
            className={`px-1 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              viewMode === 'expenses'
                ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white font-medium'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
            Expenses ({expenses.length})
          </button>
        </div>
      </div>

      {/* Budget Grid View */}
      {viewMode === 'grid' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Allocated Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(grandTotals.allocated)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(grandTotals.spent)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <TrendingDown className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Remaining Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Remaining
              </p>
              <p className={`text-2xl font-bold ${
                grandTotals.remaining < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {formatCurrency(grandTotals.remaining)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Utilization Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Utilization</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {grandTotals.allocated > 0
                  ? Math.round((grandTotals.spent / grandTotals.allocated) * 100)
                  : 0}%
              </p>
              {grandTotals.allocated > 0 && (
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-gray-900 dark:bg-gray-100"
                    style={{ width: `${Math.min((grandTotals.spent / grandTotals.allocated) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
              Search Budgets
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by category name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="on-track">On Track (&le;60%)</option>
              <option value="warning">Warning (60-100%)</option>
              <option value="over-budget">Over Budget (&gt;100%)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
              Category Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="Fixed Costs">Fixed Costs</option>
              <option value="Operational Costs">Operational Costs</option>
              <option value="Event Costs">Event Costs</option>
            </select>
          </div>
        </div>

        {/* Sort and Results Count */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{filteredAndSortedBudgets.length}</span> of {budgetSummary.length} budgets
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
            >
              <option value="name">Name (A-Z)</option>
              <option value="spent">Amount Spent</option>
              <option value="percent">% Used</option>
            </select>
          </div>
        </div>
      </div>

      {/* Budget Grid */}
      {filteredAndSortedBudgets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="max-w-md mx-auto">
            <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No budgets found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Start by setting budget allocations for your categories.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedBudgets.map((budget) => (
            <BudgetCard
              key={`${budget.category}-${budget.period}`}
              budget={budget}
              onClick={() => setSelectedBudget(budget)}
            />
          ))}
        </div>
      )}
        </>
      )}

      {/* Charts View */}
      {viewMode === 'charts' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Allocated Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(grandTotals.allocated)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(grandTotals.spent)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <TrendingDown className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Remaining Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Remaining
              </p>
              <p className={`text-2xl font-bold ${
                grandTotals.remaining < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {formatCurrency(grandTotals.remaining)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Utilization Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Utilization</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {grandTotals.allocated > 0
                  ? Math.round((grandTotals.spent / grandTotals.allocated) * 100)
                  : 0}%
              </p>
              {grandTotals.allocated > 0 && (
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-gray-900 dark:bg-gray-100"
                    style={{ width: `${Math.min((grandTotals.spent / grandTotals.allocated) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Budget Charts */}
      {budgetSummary.length > 0 && (
        <div>
          <BudgetCharts budgetSummary={budgetSummary} />
        </div>
      )}
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
          showActions={!isDemoRoute}
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
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200"
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
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePeriod}
                className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200"
              >
                Create Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Detail Modal */}
      {selectedBudget && (
        <BudgetDetailModal
          budget={selectedBudget}
          isOpen={!!selectedBudget}
          onClose={() => setSelectedBudget(null)}
          onBudgetUpdate={handleUpdateBudget}
          chapterId={currentChapter?.id || null}
          categories={categories}
          currentPeriod={currentPeriod}
        />
      )}
    </div>
  );
};

export default Budgets;
