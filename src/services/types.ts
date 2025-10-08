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

// ============================================================================
// DUES MANAGEMENT TYPES
// ============================================================================

export interface DuesConfiguration {
  id: string;
  chapter_id: string;

  // Period information
  period_name: string;
  period_type: 'Quarter' | 'Semester' | 'Year';
  period_start_date: string;
  period_end_date: string;
  fiscal_year: number;
  is_current: boolean;

  // Dues amounts by year/class
  freshman_dues: number;
  sophomore_dues: number;
  junior_dues: number;
  senior_dues: number;
  graduate_dues: number;
  alumni_dues: number;
  pledge_dues: number;
  default_dues: number;

  // Late fee configuration
  late_fee_enabled: boolean;
  late_fee_amount: number;
  late_fee_type: 'flat' | 'percentage';
  late_fee_grace_days: number;

  // Due date
  due_date: string | null;

  // Notes
  notes: string | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface MemberDues {
  id: string;
  chapter_id: string;
  member_id: string;
  config_id: string | null;

  // Dues information
  base_amount: number;
  late_fee: number;
  adjustments: number;
  total_amount: number;

  // Payment tracking
  amount_paid: number;
  balance: number;

  // Status
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';

  // Dates
  assigned_date: string;
  due_date: string | null;
  paid_date: string | null;
  late_fee_applied_date: string | null;

  // Notes
  notes: string | null;
  adjustment_reason: string | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface DuesPayment {
  id: string;
  member_dues_id: string;
  member_id: string;
  chapter_id: string;

  // Payment information
  amount: number;
  payment_method: 'Cash' | 'Check' | 'Credit Card' | 'ACH' | 'Venmo' | 'Zelle' | 'Other' | null;
  payment_date: string;

  // Reference information
  reference_number: string | null;
  receipt_url: string | null;

  // Who recorded the payment
  recorded_by: string | null;

  // Notes
  notes: string | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface MemberDuesSummary extends MemberDues {
  member_name: string;
  member_email: string;
  member_year: string | null;
  member_status: string;
  chapter_name: string;
  period_name: string;
  period_type: string;
  fiscal_year: number;
  is_overdue: boolean;
  days_overdue: number;
}

export interface ChapterDuesStats {
  chapter_id: string;
  period_name: string;
  fiscal_year: number;

  // Member counts
  total_members: number;
  members_paid: number;
  members_pending: number;
  members_overdue: number;
  members_partial: number;

  // Financial totals
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  total_late_fees: number;

  // Percentages
  payment_rate: number;
} 