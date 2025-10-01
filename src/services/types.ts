// UNIFIED EXPENSE/TRANSACTION TYPE
// This replaces the old separate Transaction type
export interface Expense {
  id: string;
  chapter_id: string;
  budget_id: string | null;
  category_id: string;
  period_id: string;
  amount: number;
  description: string;
  transaction_date: string;
  vendor: string | null;
  receipt_url: string | null;
  payment_method: 'Cash' | 'Check' | 'Credit Card' | 'ACH' | 'Venmo' | 'Other' | null;
  status: 'pending' | 'completed' | 'cancelled';
  source: 'MANUAL' | 'CHASE' | 'SWITCH' | 'CSV_IMPORT' | 'RECURRING';
  notes: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

// Expense with full details (from expense_details view)
export interface ExpenseDetail extends Expense {
  category_name: string;
  category_type: 'Fixed Costs' | 'Operational Costs' | 'Event Costs';
  period_name: string;
  period_type: 'Quarter' | 'Semester' | 'Year';
  fiscal_year: number;
  budget_allocated: number | null;
}

// Legacy Transaction type - kept for backwards compatibility
// New code should use Expense instead
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

// Budget structure types (from budgetService.ts - centralizing here)
export interface BudgetCategory {
  id: string;
  chapter_id: string;
  name: string;
  type: 'Fixed Costs' | 'Operational Costs' | 'Event Costs';
  description: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetPeriod {
  id: string;
  chapter_id: string;
  name: string;
  type: 'Quarter' | 'Semester' | 'Year';
  start_date: string;
  end_date: string;
  fiscal_year: number;
  is_current: boolean;
  created_at?: string;
}

export interface BudgetSummary {
  chapter_id: string;
  period: string;
  period_type: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  category: string;
  category_type: string;
  allocated: number;
  spent: number;
  remaining: number;
  percent_used: number;
  budget_id: string | null;
  category_id: string;
  period_id: string;
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