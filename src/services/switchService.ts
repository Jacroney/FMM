import { Transaction, SwitchTransaction } from './types';

export class SwitchService {
  private static readonly API_BASE_URL = process.env.REACT_APP_SWITCH_API_URL;
  private static readonly API_KEY = process.env.REACT_APP_SWITCH_API_KEY;

  static async getTransactions(startDate: Date, endDate: Date): Promise<Transaction[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/transfers`, {
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
        throw new Error(`Switch API error: ${response.statusText}`);
      }

      const switchTransactions: SwitchTransaction[] = await response.json();
      
      return switchTransactions.map(switchTx => ({
        id: switchTx.id,
        date: new Date(switchTx.date),
        amount: switchTx.amount,
        description: `Transfer: ${switchTx.description}`,
        category: 'Transfer',
        source: 'SWITCH',
        status: switchTx.status === 'completed' ? 'COMPLETED' : 
                switchTx.status === 'pending' ? 'PENDING' : 'FAILED'
      }));
    } catch (error) {
      console.error('Error fetching Switch transactions:', error);
      throw error;
    }
  }

  static async initiateTransfer(amount: number, recipient: string, description: string): Promise<Transaction> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/transfers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          recipient,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Switch API error: ${response.statusText}`);
      }

      const switchTx: SwitchTransaction = await response.json();
      
      return {
        id: switchTx.id,
        date: new Date(switchTx.date),
        amount: switchTx.amount,
        description: `Transfer: ${switchTx.description}`,
        category: 'Transfer',
        source: 'SWITCH',
        status: switchTx.status === 'completed' ? 'COMPLETED' : 
                switchTx.status === 'pending' ? 'PENDING' : 'FAILED'
      };
    } catch (error) {
      console.error('Error initiating Switch transfer:', error);
      throw error;
    }
  }
} 