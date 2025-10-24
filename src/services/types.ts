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
  source: 'MANUAL' | 'CHASE' | 'SWITCH' | 'CSV_IMPORT' | 'RECURRING' | 'PLAID';
  transaction_type?: 'expense' | 'income' | 'transfer';
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

// Budget allocation for a category in a period
export interface BudgetAllocation {
  id: string;
  chapter_id: string;
  category_id: string;
  period_id: string;
  allocated: number;
  notes: string | null;
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

export interface Fraternity {
  id: string;
  name: string;
  greek_letters: string | null;

  // Official fraternity colors
  primary_color: string;
  secondary_color: string;
  accent_color: string;

  // Logo
  logo_url: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface Chapter {
  id: string;
  name: string; // e.g., "Cal Poly - Sigma Chi", "Nu-Alpha"
  school: string; // e.g., "California Polytechnic State University"
  member_count: number;
  fraternity_id: string | null; // Link to fraternities table

  // Optional: Chapter-specific color overrides (inherits from fraternity if not set)
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  theme_config?: ChapterThemeConfig;

  // Fraternity relationship (populated via JOIN for colors, logo, greek letters)
  fraternity?: Fraternity;

  created_at?: string;
  updated_at?: string;
}

export interface ChapterThemeConfig {
  // Future extensibility for additional theme options
  fontFamily?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  buttonStyle?: 'solid' | 'outline' | 'ghost';
  customCSS?: string;
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

// ============================================================================
// RECURRING TRANSACTIONS TYPES
// ============================================================================

export interface RecurringTransaction {
  id: string;
  chapter_id: string;
  name: string;
  description: string | null;
  amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  next_due_date: string;
  category_id: string | null;
  period_id: string | null;
  payment_method: string | null;
  auto_post: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RecurringTransactionDetail extends RecurringTransaction {
  category_name: string | null;
  category_type: 'Fixed Costs' | 'Operational Costs' | 'Event Costs' | null;
  period_name: string | null;
}

export interface AutomationAudit {
  id: string;
  job_type: string;
  run_time: string;
  chapter_id: string | null;
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  records_errored: number;
  errors: string[] | null;
  status: 'running' | 'completed' | 'failed';
  completed_at: string | null;
}

export interface ForecastBalance {
  date: string;
  chapter_id: string;
  daily_amount: number;
  sources: string[];
  projected_balance: number;
}

// ============================================================================
// PLAID INTEGRATION TYPES
// ============================================================================

export interface PlaidConnection {
  id: string;
  chapter_id: string;
  institution_name: string | null;
  institution_id: string | null;
  access_token: string;
  item_id: string;
  cursor: string | null;
  last_synced_at: string | null;
  is_active: boolean;
  error_code: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlaidAccount {
  id: string;
  connection_id: string;
  chapter_id: string;
  account_id: string;
  account_name: string | null;
  official_name: string | null;
  account_type: string | null;
  account_subtype: string | null;
  mask: string | null;
  verification_status: string | null;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency_code: string;
  last_balance_update: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PlaidSyncHistory {
  id: string;
  connection_id: string;
  chapter_id: string;
  transactions_added: number;
  transactions_modified: number;
  transactions_removed: number;
  accounts_updated: number;
  cursor_before: string | null;
  cursor_after: string | null;
  sync_status: 'running' | 'completed' | 'failed';
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface PlaidConnectionWithDetails extends PlaidConnection {
  account_count: number;
  total_balance: number;
  accounts?: PlaidAccount[];
}

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface PlaidExchangeResponse {
  success: boolean;
  connection_id: string;
  institution_name: string;
  accounts_count: number;
}

export interface PlaidSyncResponse {
  success: boolean;
  transactions_added: number;
  transactions_modified: number;
  transactions_removed: number;
  accounts_updated: number;
}

// ============================================================================
// STRIPE PAYMENT PROCESSING TYPES
// ============================================================================

export interface StripeConnectedAccount {
  id: string;
  chapter_id: string;

  // Stripe account information
  stripe_account_id: string;
  stripe_account_type: 'express' | 'standard';

  // Account capabilities
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;

  // Onboarding status
  onboarding_completed: boolean;
  onboarding_url: string | null;
  onboarding_expires_at: string | null;

  // Bank account status
  has_bank_account: boolean;
  default_currency: string;

  // Platform fee settings
  platform_fee_percentage: number;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface PaymentIntent {
  id: string;
  chapter_id: string;
  member_dues_id: string;
  member_id: string;

  // Stripe payment intent details
  stripe_payment_intent_id: string;
  stripe_client_secret: string | null;
  stripe_charge_id: string | null;

  // Payment amounts
  amount: number;
  platform_fee: number;
  net_amount: number;
  currency: string;

  // Payment method information
  payment_method_type: 'us_bank_account' | 'card' | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;

  // Payment status
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';

  // Error handling
  failure_code: string | null;
  failure_message: string | null;

  // Timestamps
  created_at?: string;
  processing_at?: string | null;
  succeeded_at?: string | null;
  failed_at?: string | null;
  updated_at?: string;
}

export interface DuesPaymentOnline extends DuesPayment {
  payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  stripe_payout_id: string | null;
  reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
}

// API Response Types
export interface StripeConnectResponse {
  success: boolean;
  onboarding_url?: string;
  account_id?: string;
  onboarding_completed?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  has_bank_account?: boolean;
  has_account?: boolean;
  message?: string;
  error?: string;
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  client_secret?: string;
  payment_intent_id?: string;
  amount?: number;
  platform_fee?: number;
  net_amount?: number;
  error?: string;
}

export interface PaymentSummary {
  total_payments: number;
  total_amount: number;
  stripe_ach_count: number;
  stripe_ach_amount: number;
  stripe_card_count: number;
  stripe_card_amount: number;
  manual_count: number;
  manual_amount: number;
  last_payment_date: string | null;
}