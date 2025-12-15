import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useFinancial } from '../context/FinancialContext';
import { useChapter } from '../context/ChapterContext';
import { Transaction, BudgetPeriod, ExpenseDetail } from '../services/types';
import { CSVService } from '../services/csvService';
import { TransactionService } from '../services/transactionService';
import { ExpenseService } from '../services/expenseService';
import { supabase } from '../services/supabaseClient';

// Sorting types
type SortField = 'date' | 'amount' | 'description' | 'category' | 'source' | 'type';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const Transactions: React.FC = () => {
  const { transactions, budgets, addTransactions, refreshData } = useFinancial();
  const { currentChapter } = useChapter();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [duplicateResults, setDuplicateResults] = useState<any>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'duplicates' | 'preview'>('upload');

  // Budget periods state
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);

  // Expenses state (replaces legacy transactions for this page)
  const [expenses, setExpenses] = useState<ExpenseDetail[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Category editing state
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Load periods and categories on mount
  useEffect(() => {
    const loadData = async () => {
      if (currentChapter?.id) {
        setPeriodsLoading(true);
        try {
          const [periodsData, catsData] = await Promise.all([
            ExpenseService.getPeriods(currentChapter.id),
            TransactionService.fetchBudgetCategories(currentChapter.id),
          ]);
          setPeriods(periodsData);
          setCategories(catsData);

          // Set default to current period or first period
          const currentPeriod = periodsData.find(p => p.is_current);
          if (currentPeriod) {
            setSelectedPeriodId(currentPeriod.id);
          } else if (periodsData.length > 0) {
            setSelectedPeriodId(periodsData[0].id);
          }
        } catch (err) {
          console.error('Failed to load data:', err);
        } finally {
          setPeriodsLoading(false);
        }
      }
    };
    loadData();
  }, [currentChapter?.id]);

  // Fetch expenses with income included
  const fetchExpenses = useCallback(async () => {
    if (!currentChapter?.id) return;

    setExpensesLoading(true);
    try {
      const data = await ExpenseService.getExpenses(currentChapter.id, {
        periodId: selectedPeriodId || undefined,
        includeIncome: true, // Include income/deposits
      });
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      toast.error('Failed to load transactions');
    } finally {
      setExpensesLoading(false);
    }
  }, [currentChapter?.id, selectedPeriodId]);

  // Fetch expenses when chapter or period changes
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setEditingTransactionId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle category change
  const handleCategoryChange = async (transactionId: string, categoryId: string, categoryName: string) => {
    try {
      await TransactionService.updateExpenseCategory(transactionId, categoryId);
      await fetchExpenses(); // Refresh expenses after update
      await refreshData(); // Also refresh FinancialContext for consistency
      setEditingTransactionId(null);
      toast.success(`Category updated to "${categoryName}"`);
    } catch (err) {
      toast.error('Failed to update category');
    }
  };

  // Recategorize all transactions state
  const [isRecategorizing, setIsRecategorizing] = useState(false);

  // Handle recategorize all transactions
  const handleRecategorizeAll = async () => {
    if (!currentChapter?.id) {
      toast.error('No chapter selected');
      return;
    }

    const confirmed = window.confirm(
      'This will re-run auto-categorization on all transactions using the latest rules and Plaid category data. Continue?'
    );
    if (!confirmed) return;

    setIsRecategorizing(true);
    const toastId = toast.loading('Recategorizing transactions...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recategorize-transactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recategorize_all: true,
            limit: 1000,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to recategorize');
      }

      await Promise.all([refreshData(), fetchExpenses()]);
      toast.success(
        `Recategorized ${result.recategorized} of ${result.processed} transactions`,
        { id: toastId }
      );

      if (result.recategorized > 0) {
        console.log('Recategorization results:', result);
      }
    } catch (err) {
      console.error('Recategorization error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to recategorize', { id: toastId });
    } finally {
      setIsRecategorizing(false);
    }
  };

  // Get current/selected period
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter expenses by search term and sort
  const filteredExpenses = expenses
    .filter(exp =>
      exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.source?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.transaction_type?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          comparison = a.category_name.localeCompare(b.category_name);
          break;
        case 'source':
          comparison = (a.source || '').localeCompare(b.source || '');
          break;
        case 'type':
          comparison = (a.transaction_type || 'expense').localeCompare(b.transaction_type || 'expense');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Calculate period totals (accounting for income)
  const periodTotals = filteredExpenses.reduce((acc, exp) => {
    // For net total: income is positive, expense is negative
    const amount = exp.transaction_type === 'income' ? Math.abs(exp.amount) : -Math.abs(exp.amount);
    acc.total += amount;

    const category = exp.category_name;
    if (!acc.byCategory[category]) {
      acc.byCategory[category] = 0;
    }
    acc.byCategory[category] += exp.amount;

    // Track income vs expense counts
    if (exp.transaction_type === 'income') {
      acc.incomeCount++;
      acc.incomeTotal += Math.abs(exp.amount);
    } else {
      acc.expenseCount++;
      acc.expenseTotal += Math.abs(exp.amount);
    }

    return acc;
  }, {
    total: 0,
    byCategory: {} as Record<string, number>,
    incomeCount: 0,
    expenseCount: 0,
    incomeTotal: 0,
    expenseTotal: 0
  });

  useEffect(() => {
    const handleOpenImport = () => setShowImportModal(true);
    const handleRefresh = () => {
      toast.loading('Refreshing financial data…', { id: 'refresh-data' });
      Promise.all([refreshData(), fetchExpenses()])
        .then(() => toast.success('Financial data refreshed', { id: 'refresh-data' }))
        .catch(() => toast.error('Unable to refresh data', { id: 'refresh-data' }));
    };

    window.addEventListener('open-transactions-import', handleOpenImport);
    window.addEventListener('refresh-financial-data', handleRefresh);

    return () => {
      window.removeEventListener('open-transactions-import', handleOpenImport);
      window.removeEventListener('refresh-financial-data', handleRefresh);
    };
  }, [refreshData, fetchExpenses]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="surface-card space-y-6 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="surface-pill">Operations</span>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Transactions
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Import, categorise, and monitor every movement of cash for your chapter.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700/40 dark:bg-gray-800 dark:text-amber-300 dark:hover:bg-gray-700"
              onClick={handleRecategorizeAll}
              disabled={isRecategorizing || expenses.length === 0}
              title="Re-run auto-categorization on all transactions"
            >
              {isRecategorizing ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {isRecategorizing ? 'Recategorizing...' : 'Recategorize All'}
            </button>
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-4 py-2.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-700/40 dark:bg-gray-800 dark:text-sky-300 dark:hover:bg-gray-700"
              onClick={() => {
                const periodName = selectedPeriod?.name.replace(/\s+/g, '-').toLowerCase() || 'all';
                // Convert ExpenseDetail to Transaction format for CSV export
                const txForExport = filteredExpenses.map(exp => ({
                  id: exp.id,
                  chapter_id: exp.chapter_id,
                  date: new Date(exp.transaction_date),
                  amount: exp.amount,
                  description: exp.description,
                  category: exp.category_name,
                  source: exp.source as 'CHASE' | 'SWITCH' | 'MANUAL',
                  status: (exp.status?.toUpperCase() || 'COMPLETED') as 'PENDING' | 'COMPLETED' | 'FAILED'
                }));
                CSVService.exportTransactionsToCSV(
                  txForExport,
                  `transactions-${periodName}-${selectedPeriod?.fiscal_year || new Date().getFullYear()}.csv`
                );
              }}
              disabled={filteredExpenses.length === 0}
              title={filteredExpenses.length === 0 ? 'No transactions to export' : undefined}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Export CSV
            </button>
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700/40 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-gray-700"
              onClick={() => setShowImportModal(true)}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import CSV
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {periodsLoading ? (
            <div className="col-span-full flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-slate-500">Loading periods...</span>
            </div>
          ) : periods.length === 0 ? (
            <div className="col-span-full text-center py-4 text-sm text-slate-500">
              No budget periods configured. Set up periods in the Budgets page.
            </div>
          ) : (
            periods.slice(0, 4).map((period) => (
              <button
                key={period.id}
                type="button"
                onClick={() => setSelectedPeriodId(period.id)}
                className={`focus-ring rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  selectedPeriodId === period.id
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                    : 'border-[var(--brand-border)] bg-white text-slate-600 hover:bg-slate-100 dark:bg-gray-800 dark:text-slate-300'
                }`}
              >
                <span className="font-medium">{period.name}</span>
                <p className="text-xs text-slate-500">
                  {period.type} • {period.fiscal_year}
                  {period.is_current && <span className="ml-1 text-emerald-600 dark:text-emerald-400">(Current)</span>}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="surface-panel p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Transactions</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{filteredExpenses.length}</p>
            <p className="text-xs text-slate-500">
              {periodTotals.expenseCount} expenses • {periodTotals.incomeCount} income
            </p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Net movement</p>
            <p className={`mt-2 text-2xl font-semibold ${periodTotals.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {formatCurrency(periodTotals.total)}
            </p>
            <p className="text-xs text-slate-500">
              <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(periodTotals.incomeTotal)}</span>
              {' / '}
              <span className="text-rose-500">-{formatCurrency(periodTotals.expenseTotal)}</span>
            </p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Highest category</p>
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {
                Object.entries(periodTotals.byCategory)
                  .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))[0]?.[0] || '—'
              }
            </p>
            <p className="text-xs text-slate-500">Top share this period</p>
          </div>
          <div className="surface-panel p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Search</p>
            <input
              type="text"
              placeholder="Search description, category, source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus-ring mt-2 w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-slate-700 dark:bg-gray-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="surface-card relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 animate-pop">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => {
                setShowImportModal(false);
                setCsvData([]);
                setCsvHeaders([]);
                setFieldMapping({});
                setParsedTransactions([]);
                setDuplicateResults(null);
                setImportErrors([]);
                setImportStep('upload');
              }}
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Import Transactions from CSV</h2>
            {importStep === 'upload' && (
              <>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsImporting(true);
                    setImportErrors([]);
                    try {
                      const result = await CSVService.parseCSV(file);
                      if (result.success) {
                        setCsvData(result.data);
                        setCsvHeaders(result.headers);
                        setFieldMapping(result.suggestions);
                        setImportStep('mapping');
                      } else {
                        setImportErrors(result.errors);
                      }
                    } catch (error) {
                      setImportErrors([error instanceof Error ? error.message : 'Failed to parse CSV']);
                    } finally {
                      setIsImporting(false);
                    }
                  }}
                  className="mb-4 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  <p>Supported formats: CSV files with headers</p>
                  <p>Required fields: Date, Amount, Description</p>
                </div>
              </>
            )}

            {importStep === 'mapping' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Map CSV Fields</h3>
                <div className="space-y-3 mb-4">
                  {['date', 'amount', 'description', 'category'].map(field => (
                    <div key={field} className="flex items-center space-x-3">
                      <label className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{field}:</label>
                      <select
                        value={fieldMapping[field] || ''}
                        onChange={(e) => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm [&>option]:dark:text-white [&>option]:dark:bg-gray-700"
                        required={field !== 'category'}
                      >
                        <option value="">Select field...</option>
                        {csvHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <button
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setImportStep('upload')}
                  >
                    Back
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => {
                      const { transactions: csvTransactions, errors } = CSVService.convertCSVToTransactions(csvData, fieldMapping);
                      if (errors.length > 0) {
                        setImportErrors(errors);
                        return;
                      }
                      setParsedTransactions(csvTransactions.map(tx => ({ ...tx, id: crypto.randomUUID() })));
                      const duplicateCheck = CSVService.checkForDuplicates(csvTransactions, transactions);
                      setDuplicateResults(duplicateCheck);
                      setImportStep('duplicates');
                    }}
                    disabled={!fieldMapping.date || !fieldMapping.amount || !fieldMapping.description}
                  >
                    Process Data
                  </button>
                </div>
              </>
            )}

            {importStep === 'duplicates' && duplicateResults && (
              <>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Duplicate Detection Results</h3>
                <div className="space-y-4 mb-4">
                  <div className="bg-green-50 p-3 rounded border">
                    <h4 className="font-medium text-green-800">✅ Unique Transactions: {duplicateResults.unique.length}</h4>
                  </div>
                  
                  {duplicateResults.duplicates.length > 0 && (
                    <div className="bg-red-50 p-3 rounded border">
                      <h4 className="font-medium text-red-800 mb-2">⚠️ Exact Duplicates Found: {duplicateResults.duplicates.length}</h4>
                      <div className="max-h-32 overflow-y-auto text-sm">
                        {duplicateResults.duplicates.slice(0, 5).map((tx: Transaction, idx: number) => (
                          <div key={idx} className="text-red-700">
                            {formatDate(tx.date)} - {tx.description} - {formatCurrency(tx.amount)}
                          </div>
                        ))}
                        {duplicateResults.duplicates.length > 5 && (
                          <div className="text-red-600 italic">...and {duplicateResults.duplicates.length - 5} more</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {duplicateResults.similarTransactions.length > 0 && (
                    <div className="bg-yellow-50 p-3 rounded border">
                      <h4 className="font-medium text-yellow-800 mb-2">⚠️ Similar Transactions: {duplicateResults.similarTransactions.length}</h4>
                      <div className="max-h-32 overflow-y-auto text-sm">
                        {duplicateResults.similarTransactions.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="text-yellow-700 mb-1">
                            <div>CSV: {item.csvTransaction.description} - {formatCurrency(item.csvTransaction.amount)}</div>
                            <div>Existing: {item.existingTransaction.description} - {formatCurrency(item.existingTransaction.amount)}</div>
                            <div className="text-xs">Similarity: {Math.round(item.similarity * 100)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setImportStep('mapping')}
                  >
                    Back
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => setImportStep('preview')}
                  >
                    Continue with {duplicateResults.unique.length} Unique Transactions
                  </button>
                </div>
              </>
            )}

            {importStep === 'preview' && (
              <>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview Transactions ({duplicateResults?.unique.length || 0})</h3>
                <div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded mb-4">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-2 py-1 text-left text-gray-700 dark:text-gray-300">Date</th>
                        <th className="px-2 py-1 text-left text-gray-700 dark:text-gray-300">Description</th>
                        <th className="px-2 py-1 text-left text-gray-700 dark:text-gray-300">Category</th>
                        <th className="px-2 py-1 text-left text-gray-700 dark:text-gray-300">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {(duplicateResults?.unique || []).slice(0, 10).map((tx: Transaction, idx: number) => (
                        <tr key={idx} className="text-gray-900 dark:text-gray-200">
                          <td className="px-2 py-1">{formatDate(new Date(tx.date))}</td>
                          <td className="px-2 py-1">{tx.description}</td>
                          <td className="px-2 py-1">{tx.category}</td>
                          <td className="px-2 py-1 font-medium">
                            <span className={tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {formatCurrency(tx.amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(duplicateResults?.unique.length || 0) > 10 && (
                    <div className="text-gray-500 dark:text-gray-400 text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700">
                      ...and {(duplicateResults?.unique.length || 0) - 10} more transactions
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setImportStep('duplicates')}
                  >
                    Back
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={async () => {
                      setIsImporting(true);
                      try {
                        await addTransactions(duplicateResults.unique.map((tx: Transaction) => ({
                          date: tx.date,
                          amount: tx.amount,
                          description: tx.description,
                          category: tx.category,
                          source: tx.source,
                          status: tx.status
                        })));
                        setShowImportModal(false);
                        // Reset state
                        setCsvData([]);
                        setCsvHeaders([]);
                        setFieldMapping({});
                        setParsedTransactions([]);
                        setDuplicateResults(null);
                        setImportStep('upload');
                      } catch (error) {
                        setImportErrors([error instanceof Error ? error.message : 'Failed to import transactions']);
                      } finally {
                        setIsImporting(false);
                      }
                    }}
                    disabled={isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Import Transactions'}
                  </button>
                </div>
              </>
            )}
            {isImporting && (
              <div className="flex items-center space-x-2 text-blue-600 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Processing...</span>
              </div>
            )}
            
            {importErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-medium text-red-800 mb-2">Import Errors:</h4>
                <div className="text-red-700 text-sm space-y-1">
                  {importErrors.map((err, idx) => <div key={idx}>• {err}</div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Period Summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {selectedPeriod ? `${selectedPeriod.name} Summary` : 'Period Summary'}
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span>Total transactions</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredExpenses.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total income</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(periodTotals.incomeTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total expenses</span>
              <span className="font-semibold text-rose-500">-{formatCurrency(periodTotals.expenseTotal)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
              <span className="font-medium">Net amount</span>
              <span className={`font-semibold ${periodTotals.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {formatCurrency(periodTotals.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Category breakdown</h2>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto text-sm text-slate-600 dark:text-slate-300">
            {Object.entries(periodTotals.byCategory)
              .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
              .map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between gap-3">
                  <span className="truncate capitalize">{category}</span>
                  <span className={`font-medium ${amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="surface-card overflow-hidden">
        {/* Mobile Card View */}
        <div className="sm:hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${expense.transaction_type === 'income' ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {expense.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(new Date(expense.transaction_date))} •{' '}
                      <button
                        onClick={() => setEditingTransactionId(editingTransactionId === expense.id ? null : expense.id)}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {expense.category_name}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {editingTransactionId === expense.id && (
                        <div ref={categoryDropdownRef} className="absolute left-4 mt-1 z-10 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => handleCategoryChange(expense.id, cat.id, cat.name)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                cat.name === expense.category_name ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </p>
                    {/* Source and Type badges for mobile */}
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        expense.transaction_type === 'income'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : expense.transaction_type === 'transfer'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                      }`}>
                        {expense.transaction_type || 'expense'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        expense.source === 'PLAID'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                          : expense.source === 'CSV_IMPORT'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {expense.source === 'PLAID' ? 'Bank' :
                         expense.source === 'CSV_IMPORT' ? 'Import' :
                         expense.source === 'RECURRING' ? 'Recurring' :
                         'Manual'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <span className={`text-sm font-medium ${
                      expense.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {expense.transaction_type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(expense.amount))}
                    </span>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        expense.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {expense.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortField === 'date' && (
                      <span className="text-blue-600 dark:text-blue-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center gap-1">
                    Description
                    {sortField === 'description' && (
                      <span className="text-blue-600 dark:text-blue-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Category
                    {sortField === 'category' && (
                      <span className="text-blue-600 dark:text-blue-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortField === 'type' && (
                      <span className="text-blue-600 dark:text-blue-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('source')}
                >
                  <div className="flex items-center gap-1">
                    Source
                    {sortField === 'source' && (
                      <span className="text-blue-600 dark:text-blue-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    Amount
                    {sortField === 'amount' && (
                      <span className="text-blue-600 dark:text-blue-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${expense.transaction_type === 'income' ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(new Date(expense.transaction_date))}
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    <span title={expense.description}>{expense.description}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm relative">
                    <button
                      onClick={() => setEditingTransactionId(editingTransactionId === expense.id ? null : expense.id)}
                      className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                    >
                      {expense.category_name}
                      <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {editingTransactionId === expense.id && (
                      <div ref={categoryDropdownRef} className="absolute left-4 top-full mt-1 z-20 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Select Category</p>
                        </div>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryChange(expense.id, cat.id, cat.name)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                              cat.name === expense.category_name
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {cat.name === expense.category_name && (
                              <svg className="w-4 h-4 inline mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-4 font-medium rounded-full ${
                      expense.transaction_type === 'income'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : expense.transaction_type === 'transfer'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                    }`}>
                      {expense.transaction_type || 'expense'}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-4 font-medium rounded-full ${
                      expense.source === 'PLAID'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : expense.source === 'CSV_IMPORT'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : expense.source === 'RECURRING'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {expense.source === 'PLAID' ? '🏦 Bank' :
                       expense.source === 'CSV_IMPORT' ? '📄 Import' :
                       expense.source === 'RECURRING' ? '🔄 Recurring' :
                       expense.source === 'MANUAL' ? '✏️ Manual' :
                       expense.source || 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={expense.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {expense.transaction_type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(expense.amount))}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${expense.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {expense.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredExpenses.length === 0 && !expensesLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or select a different period.</p>
          </div>
        )}
        {/* Loading state */}
        {expensesLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading transactions...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions; 
