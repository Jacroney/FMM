import { Transaction, CSVImportResult } from './types';
import Papa from 'papaparse';

interface CSVMappingResult {
  success: boolean;
  data: any[];
  headers: string[];
  errors: string[];
  suggestions: Record<string, string>;
}

interface DuplicateCheckResult {
  duplicates: Transaction[];
  unique: Transaction[];
  similarTransactions: Array<{
    csvTransaction: Transaction;
    existingTransaction: Transaction;
    similarity: number;
  }>;
}

export class CSVService {
  // Standard field mappings for common CSV formats
  private static FIELD_MAPPINGS = {
    date: ['date', 'transaction_date', 'transactiondate', 'tx_date', 'posted_date', 'posting_date'],
    amount: ['amount', 'value', 'sum', 'total', 'transaction_amount', 'debit', 'credit'],
    description: ['description', 'memo', 'details', 'transaction_description', 'merchant', 'payee'],
    category: ['category', 'type', 'classification', 'expense_type', 'transaction_type']
  };

  // Parse CSV file and detect structure
  static async parseCSV(file: File): Promise<CSVMappingResult> {
    return new Promise((resolve) => {
      const result: CSVMappingResult = {
        success: true,
        data: [],
        headers: [],
        errors: [],
        suggestions: {}
      };

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          try {
            result.data = results.data;
            result.headers = results.meta.fields || [];
            
            // Generate field mapping suggestions
            result.suggestions = this.suggestFieldMappings(result.headers);
            
            if (results.errors.length > 0) {
              result.errors = results.errors.map(err => err.message);
            }
            
          } catch (error) {
            result.success = false;
            result.errors.push(`Error processing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          resolve(result);
        },
        error: (error) => {
          result.success = false;
          result.errors.push(`Error reading CSV: ${error.message}`);
          resolve(result);
        }
      });
    });
  }

  // Suggest field mappings based on header names
  private static suggestFieldMappings(headers: string[]): Record<string, string> {
    const suggestions: Record<string, string> = {};
    
    for (const requiredField of Object.keys(this.FIELD_MAPPINGS)) {
      const possibleMappings = this.FIELD_MAPPINGS[requiredField as keyof typeof this.FIELD_MAPPINGS];
      
      for (const header of headers) {
        const normalizedHeader = header.toLowerCase().replace(/[\s_-]/g, '');
        
        if (possibleMappings.some(mapping => 
          normalizedHeader.includes(mapping.replace(/[\s_-]/g, ''))
        )) {
          suggestions[requiredField] = header;
          break;
        }
      }
    }
    
    return suggestions;
  }

  // Convert CSV data to transactions with field mapping
  static convertCSVToTransactions(
    csvData: any[], 
    fieldMapping: Record<string, string>
  ): { transactions: Omit<Transaction, 'id'>[], errors: string[] } {
    const transactions: Omit<Transaction, 'id'>[] = [];
    const errors: string[] = [];

    csvData.forEach((row, index) => {
      try {
        // Extract mapped fields
        const dateValue = row[fieldMapping.date];
        const amountValue = row[fieldMapping.amount];
        const descriptionValue = row[fieldMapping.description];
        const categoryValue = row[fieldMapping.category];

        // Validate required fields
        if (!dateValue) {
          errors.push(`Row ${index + 1}: Missing date`);
          return;
        }
        if (amountValue === undefined || amountValue === null || amountValue === '') {
          errors.push(`Row ${index + 1}: Missing amount`);
          return;
        }
        if (!descriptionValue) {
          errors.push(`Row ${index + 1}: Missing description`);
          return;
        }

        // Parse and validate date
        const parsedDate = new Date(dateValue);
        if (isNaN(parsedDate.getTime())) {
          errors.push(`Row ${index + 1}: Invalid date format: ${dateValue}`);
          return;
        }

        // Parse and validate amount
        const parsedAmount = typeof amountValue === 'number' ? amountValue : parseFloat(String(amountValue).replace(/[$,]/g, ''));
        if (isNaN(parsedAmount)) {
          errors.push(`Row ${index + 1}: Invalid amount: ${amountValue}`);
          return;
        }

        transactions.push({
          date: parsedDate,
          amount: parsedAmount,
          description: String(descriptionValue).trim(),
          category: categoryValue ? String(categoryValue).trim() : 'Uncategorized',
          source: 'MANUAL' as const,
          status: 'COMPLETED' as const
        });

      } catch (error) {
        errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    return { transactions, errors };
  }

  // Check for duplicates against existing transactions
  static checkForDuplicates(
    csvTransactions: Omit<Transaction, 'id'>[],
    existingTransactions: Transaction[]
  ): DuplicateCheckResult {
    const duplicates: Transaction[] = [];
    const unique: Transaction[] = [];
    const similarTransactions: DuplicateCheckResult['similarTransactions'] = [];

    csvTransactions.forEach(csvTx => {
      let isDuplicate = false;
      let highestSimilarity = 0;
      let mostSimilarTransaction: Transaction | null = null;

      // Check against existing transactions
      for (const existingTx of existingTransactions) {
        // Exact match check
        if (this.isExactDuplicate(csvTx, existingTx)) {
          duplicates.push({
            ...csvTx,
            id: crypto.randomUUID()
          });
          isDuplicate = true;
          break;
        }

        // Similarity check
        const similarity = this.calculateSimilarity(csvTx, existingTx);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          mostSimilarTransaction = existingTx;
        }
      }

      if (!isDuplicate) {
        unique.push({
          ...csvTx,
          id: crypto.randomUUID()
        });

        // If similarity is high (>70%), mark as potentially similar
        if (highestSimilarity > 0.7 && mostSimilarTransaction) {
          similarTransactions.push({
            csvTransaction: {
              ...csvTx,
              id: crypto.randomUUID()
            },
            existingTransaction: mostSimilarTransaction,
            similarity: highestSimilarity
          });
        }
      }
    });

    return { duplicates, unique, similarTransactions };
  }

  // Check if two transactions are exact duplicates
  private static isExactDuplicate(tx1: Omit<Transaction, 'id'>, tx2: Transaction): boolean {
    const dateMatch = Math.abs(tx1.date.getTime() - new Date(tx2.date).getTime()) < 24 * 60 * 60 * 1000; // Same day
    const amountMatch = Math.abs(tx1.amount - tx2.amount) < 0.01; // Within 1 cent
    const descriptionMatch = tx1.description.toLowerCase().trim() === tx2.description.toLowerCase().trim();
    
    return dateMatch && amountMatch && descriptionMatch;
  }

  // Calculate similarity score between two transactions
  private static calculateSimilarity(tx1: Omit<Transaction, 'id'>, tx2: Transaction): number {
    let score = 0;
    
    // Date similarity (50% weight)
    const dateDiff = Math.abs(tx1.date.getTime() - new Date(tx2.date).getTime());
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
    const dateScore = Math.max(0, 1 - daysDiff / 30); // Linear decay over 30 days
    score += dateScore * 0.5;
    
    // Amount similarity (30% weight)
    const amountDiff = Math.abs(tx1.amount - tx2.amount);
    const amountScore = amountDiff < 0.01 ? 1 : Math.max(0, 1 - amountDiff / Math.abs(tx1.amount));
    score += amountScore * 0.3;
    
    // Description similarity (20% weight)
    const desc1 = tx1.description.toLowerCase().trim();
    const desc2 = tx2.description.toLowerCase().trim();
    const descScore = this.stringSimilarity(desc1, desc2);
    score += descScore * 0.2;
    
    return score;
  }

  // Calculate string similarity using Levenshtein distance
  private static stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  // Calculate Levenshtein distance
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Legacy method for backward compatibility
  static async importTransactions(file: File): Promise<CSVImportResult> {
    try {
      const parseResult = await this.parseCSV(file);
      
      if (!parseResult.success) {
        return {
          success: false,
          transactions: [],
          errors: parseResult.errors
        };
      }

      const { transactions, errors } = this.convertCSVToTransactions(
        parseResult.data,
        parseResult.suggestions
      );

      return {
        success: errors.length === 0,
        transactions: transactions.map(tx => ({ ...tx, id: crypto.randomUUID() })),
        errors
      };
    } catch (error) {
      return {
        success: false,
        transactions: [],
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  // Validate CSV headers
  static validateCSVHeaders(headers: string[]): boolean {
    const requiredFields = Object.keys(this.FIELD_MAPPINGS);
    return requiredFields.some(field => 
      this.FIELD_MAPPINGS[field as keyof typeof this.FIELD_MAPPINGS].some(mapping =>
        headers.some(header => 
          header.toLowerCase().replace(/[\s_-]/g, '').includes(mapping.replace(/[\s_-]/g, ''))
        )
      )
    );
  }

  // Export transactions to CSV
  static exportTransactionsToCSV(transactions: Transaction[], filename?: string): void {
    const csvData = transactions.map(tx => ({
      date: new Date(tx.date).toLocaleDateString(),
      amount: tx.amount,
      description: tx.description,
      category: tx.category,
      source: tx.source,
      status: tx.status
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `transactions-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
} 