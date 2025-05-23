export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  category: string;
  source: 'CHASE' | 'SWITCH' | 'MANUAL';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category: string;
  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  startDate: Date;
  endDate: Date;
}

export interface CSVImportResult {
  success: boolean;
  transactions: Transaction[];
  errors: string[];
}

export interface ChaseTransaction {
  transactionDate: string;
  description: string;
  amount: number;
  category: string;
  accountNumber: string;
}

export interface SwitchTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  sender: string;
  recipient: string;
  status: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Inactive';
  duesPaid: boolean;
  paymentDate: string | null;
  semester: string;
  lastUpdated: string;
} 