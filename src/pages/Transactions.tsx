import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Transaction } from '../services/types';
import { CSVService } from '../services/csvService';

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
  const { transactions, budgets, addTransactions } = useFinancial();
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
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

  // Get current quarter
  const getCurrentQuarter = () => {
    const month = new Date().getMonth();
    return `Q${Math.floor(month / 3) + 1}`;
  };

  // Filter transactions by quarter
  const getQuarterTransactions = () => {
    const quarter = selectedQuarter;
    const year = new Date().getFullYear();
    const startMonth = (parseInt(quarter[1]) - 1) * 3;
    const endMonth = startMonth + 2;

    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === year && 
             txDate.getMonth() >= startMonth && 
             txDate.getMonth() <= endMonth;
    });
  };

  // Filter transactions by search term
  const filteredTransactions = getQuarterTransactions().filter(tx =>
    tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate quarterly totals
  const quarterlyTotals = filteredTransactions.reduce((acc, tx) => {
    acc.total += tx.amount;
    if (!acc.byCategory[tx.category]) {
      acc.byCategory[tx.category] = 0;
    }
    acc.byCategory[tx.category] += tx.amount;
    return acc;
  }, { total: 0, byCategory: {} as Record<string, number> });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage all financial transactions</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              CSVService.exportTransactionsToCSV(
                filteredTransactions,
                `transactions-${selectedQuarter}-${new Date().getFullYear()}.csv`
              );
            }}
            disabled={filteredTransactions.length === 0}
            title={filteredTransactions.length === 0 ? 'No transactions to export' : undefined}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Export CSV
          </button>
          <button
            className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
            onClick={() => setShowImportModal(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import CSV
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
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

      {/* Quarterly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quarterly Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Total Transactions:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{filteredTransactions.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Total Amount:</span>
              <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{formatCurrency(quarterlyTotals.total)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h2>
          <div className="space-y-2 max-h-32 sm:max-h-none overflow-y-auto">
            {Object.entries(quarterlyTotals.byCategory).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 text-sm sm:text-base truncate mr-2">{category}:</span>
                <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base flex-shrink-0">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Mobile Card View */}
        <div className="sm:hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(transaction.date)} • {transaction.category}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <span className={`text-sm font-medium ${
                      transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(transaction.amount)}
                    </span>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {transaction.status}
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
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    <span title={transaction.description}>{transaction.description}</span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {transaction.category}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or select a different quarter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions; 