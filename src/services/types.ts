export interface Transaction {
  id: string;
  chapter_id: string;
  date: Date;
  amount: number;
  description: string;
  category: string;
  source: 'CHASE' | 'SWITCH' | 'MANUAL';
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface Budget {
  id: string;
  chapter_id: string;
  name: string;
  amount: number;
  spent: number;
  category: string;
  period: 'QUARTERLY' | 'YEARLY';
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

export interface Chapter {
  id: string;
  name: string;
  school: string;
  member_count: number;
  fraternity_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Member {
  id: string;
  chapter_id: string;
  name: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Pledge' | 'Alumni';
  year: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate' | 'Alumni' | null;
  duesPaid: boolean;
  paymentDate: string | null;
  semester: string;
  lastUpdated: string;
} 