import { Transaction, ChaseTransaction } from './types';

export class ChaseService {
  private static readonly API_BASE_URL = process.env.REACT_APP_CHASE_API_URL;
  private static readonly API_KEY = process.env.REACT_APP_CHASE_API_KEY;

  static async getTransactions(startDate: Date, endDate: Date): Promise<Transaction[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/transactions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Chase API error: ${response.statusText}`);
      }

      const chaseTransactions: ChaseTransaction[] = await response.json();
      
      return chaseTransactions.map(chaseTx => ({
        id: crypto.randomUUID(),
        date: new Date(chaseTx.transactionDate),
        amount: chaseTx.amount,
        description: chaseTx.description,
        category: chaseTx.category,
        source: 'CHASE',
        status: 'COMPLETED'
      }));
    } catch (error) {
      console.error('Error fetching Chase transactions:', error);
      throw error;
    }
  }

  static async getAccountBalance(): Promise<number> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Chase API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.balance;
    } catch (error) {
      console.error('Error fetching Chase balance:', error);
      throw error;
    }
  }
} 