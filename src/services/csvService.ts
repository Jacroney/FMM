import { Transaction, CSVImportResult } from './types';
import Papa from 'papaparse';

export class CSVService {
  static async importTransactions(file: File): Promise<CSVImportResult> {
    return new Promise((resolve) => {
      const result: CSVImportResult = {
        success: true,
        transactions: [],
        errors: []
      };

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            result.transactions = results.data.map((row: any) => ({
              id: crypto.randomUUID(),
              date: new Date(row.date || row.transactionDate),
              amount: parseFloat(row.amount),
              description: row.description,
              category: row.category || 'Uncategorized',
              source: 'MANUAL',
              status: 'COMPLETED'
            }));
          } catch (error) {
            result.success = false;
            result.errors.push(`Error processing CSV: ${error.message}`);
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

  static validateCSVHeaders(headers: string[]): boolean {
    const requiredHeaders = ['date', 'amount', 'description'];
    return requiredHeaders.every(header => headers.includes(header));
  }
} 