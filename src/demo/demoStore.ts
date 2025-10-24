import {
  Budget,
  BudgetCategory,
  BudgetPeriod,
  BudgetSummary,
  Chapter,
  ExpenseDetail,
  Member,
  PlaidAccount,
  PlaidConnectionWithDetails,
  RecurringTransaction,
  Transaction
} from '../services/types';

export type PlaidSyncLogEntry = {
  id: string;
  time: string;
  detail: string;
  status: 'success' | 'warning' | 'info';
};

interface DemoState {
  chapter: Chapter;
  chapters: Chapter[];
  transactions: Transaction[];
  budgets: Budget[];
  budgetCategories: BudgetCategory[];
  budgetPeriods: BudgetPeriod[];
  budgetSummary: BudgetSummary[];
  expenses: ExpenseDetail[];
  members: Member[];
  recurring: RecurringTransaction[];
  plaidConnections: PlaidConnectionWithDetails[];
  plaidAccounts: Record<string, PlaidAccount[]>;
  plaidLog: PlaidSyncLogEntry[];
}

const chapterId = '00000000-0000-0000-0000-000000000001';

const demoChapter: Chapter = {
  id: chapterId,
  name: 'Alpha Beta Chapter',
  school: 'Demo University',
  member_count: 48,
  fraternity_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const demoTransactions: Transaction[] = [
  {
    id: 'demo-tx-1',
    chapter_id: chapterId,
    date: new Date('2025-06-15T09:00:00Z'),
    amount: 35000,
    description: 'Opening treasury balance',
    category: 'Opening Balance',
    source: 'MANUAL',
    status: 'COMPLETED'
  },
  {
    id: 'demo-tx-2',
    chapter_id: chapterId,
    date: new Date('2025-06-10T09:00:00Z'),
    amount: 8650,
    description: 'Member dues ACH sweep',
    category: 'Dues',
    source: 'MANUAL',
    status: 'COMPLETED'
  },
  {
    id: 'demo-tx-3',
    chapter_id: chapterId,
    date: new Date('2025-06-08T09:00:00Z'),
    amount: -2800,
    description: 'Chapter house lease payment',
    category: 'Operations',
    source: 'MANUAL',
    status: 'COMPLETED'
  },
  {
    id: 'demo-tx-4',
    chapter_id: chapterId,
    date: new Date('2025-06-06T09:00:00Z'),
    amount: -1320,
    description: 'Catering invoice – summer retreat',
    category: 'Events',
    source: 'MANUAL',
    status: 'COMPLETED'
  },
  {
    id: 'demo-tx-5',
    chapter_id: chapterId,
    date: new Date('2025-05-28T09:00:00Z'),
    amount: 4500,
    description: 'Philanthropy fundraising proceeds',
    category: 'Philanthropy',
    source: 'MANUAL',
    status: 'COMPLETED'
  },
  {
    id: 'demo-tx-6',
    chapter_id: chapterId,
    date: new Date('2025-05-12T09:00:00Z'),
    amount: -650,
    description: 'Operations supplies restock',
    category: 'Operations',
    source: 'MANUAL',
    status: 'COMPLETED'
  },
  {
    id: 'demo-tx-7',
    chapter_id: chapterId,
    date: new Date('2025-04-22T09:00:00Z'),
    amount: -1200,
    description: 'Leadership travel reimbursement',
    category: 'Leadership',
    source: 'MANUAL',
    status: 'COMPLETED'
  },
  {
    id: 'demo-tx-8',
    chapter_id: chapterId,
    date: new Date('2025-04-15T09:00:00Z'),
    amount: -1630,
    description: 'Stripe processing fees',
    category: 'Fees',
    source: 'MANUAL',
    status: 'COMPLETED'
  },
  {
    id: 'demo-tx-9',
    chapter_id: chapterId,
    date: new Date('2025-02-18T09:00:00Z'),
    amount: 3200,
    description: 'Alumni donor contribution',
    category: 'Income',
    source: 'MANUAL',
    status: 'COMPLETED'
  },
  {
    id: 'demo-tx-10',
    chapter_id: chapterId,
    date: new Date('2025-02-21T09:00:00Z'),
    amount: -3200,
    description: 'Winter leadership retreat deposit',
    category: 'Events',
    source: 'MANUAL',
    status: 'COMPLETED'
  }
];

const periodId = 'demo-period-1';

const demoBudgetCategories: BudgetCategory[] = [
  {
    id: 'demo-cat-1',
    chapter_id: chapterId,
    name: 'Events',
    type: 'Event Costs',
    description: 'Formals, philanthropy, and social programming',
    is_active: true
  },
  {
    id: 'demo-cat-2',
    chapter_id: chapterId,
    name: 'Operations',
    type: 'Operational Costs',
    description: 'Day-to-day expenses and administration',
    is_active: true
  },
  {
    id: 'demo-cat-3',
    chapter_id: chapterId,
    name: 'Philanthropy',
    type: 'Event Costs',
    description: 'Fundraising events and charitable donations',
    is_active: true
  }
];

const demoBudgetPeriods: BudgetPeriod[] = [
  {
    id: periodId,
    chapter_id: chapterId,
    name: 'FY25 – Spring',
    type: 'Semester',
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    fiscal_year: 2025,
    is_current: true
  }
];

const demoBudgets: Budget[] = [
  {
    id: 'demo-budget-1',
    chapter_id: chapterId,
    name: 'Events – FY25 Spring',
    amount: 12000,
    spent: 8400,
    category: 'Events',
    period: 'YEARLY',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-06-30')
  },
  {
    id: 'demo-budget-2',
    chapter_id: chapterId,
    name: 'Operations – FY25 Spring',
    amount: 5800,
    spent: 3600,
    category: 'Operations',
    period: 'YEARLY',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-06-30')
  },
  {
    id: 'demo-budget-3',
    chapter_id: chapterId,
    name: 'Philanthropy – FY25 Spring',
    amount: 4200,
    spent: 1900,
    category: 'Philanthropy',
    period: 'YEARLY',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-06-30')
  }
];

const demoBudgetSummary: BudgetSummary[] = [
  {
    chapter_id: chapterId,
    period: 'FY25 – Spring',
    period_type: 'Semester',
    fiscal_year: 2025,
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    category: 'Events',
    category_type: 'Event Costs',
    allocated: 12000,
    spent: 8400,
    remaining: 3600,
    percent_used: 70,
    budget_id: 'demo-budget-1',
    category_id: 'demo-cat-1',
    period_id: periodId
  },
  {
    chapter_id: chapterId,
    period: 'FY25 – Spring',
    period_type: 'Semester',
    fiscal_year: 2025,
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    category: 'Operations',
    category_type: 'Operational Costs',
    allocated: 5800,
    spent: 3600,
    remaining: 2200,
    percent_used: 62.1,
    budget_id: 'demo-budget-2',
    category_id: 'demo-cat-2',
    period_id: periodId
  },
  {
    chapter_id: chapterId,
    period: 'FY25 – Spring',
    period_type: 'Semester',
    fiscal_year: 2025,
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    category: 'Philanthropy',
    category_type: 'Event Costs',
    allocated: 4200,
    spent: 1900,
    remaining: 2300,
    percent_used: 45.2,
    budget_id: 'demo-budget-3',
    category_id: 'demo-cat-3',
    period_id: periodId
  }
];

const demoExpenses: ExpenseDetail[] = [
  {
    id: 'demo-exp-1',
    chapter_id: chapterId,
    budget_id: 'demo-budget-2',
    category_id: 'demo-cat-2',
    period_id: periodId,
    amount: 2800,
    description: 'Chapter house lease payment',
    transaction_date: '2025-06-08',
    vendor: 'Campus Realty Group',
    receipt_url: null,
    payment_method: 'ACH',
    status: 'completed',
    source: 'MANUAL',
    notes: 'Auto-drafted on first business day',
    created_by: null,
    category_name: 'Operations',
    category_type: 'Operational Costs',
    period_name: 'FY25 – Spring',
    period_type: 'Semester',
    fiscal_year: 2025,
    budget_allocated: 5800
  },
  {
    id: 'demo-exp-2',
    chapter_id: chapterId,
    budget_id: 'demo-budget-1',
    category_id: 'demo-cat-1',
    period_id: periodId,
    amount: 1320,
    description: 'Catering invoice – summer retreat',
    transaction_date: '2025-06-06',
    vendor: 'Campus Catering Co.',
    receipt_url: null,
    payment_method: 'Credit Card',
    status: 'completed',
    source: 'MANUAL',
    notes: 'Includes vegetarian options',
    created_by: null,
    category_name: 'Events',
    category_type: 'Event Costs',
    period_name: 'FY25 – Spring',
    period_type: 'Semester',
    fiscal_year: 2025,
    budget_allocated: 12000
  }
];

const demoMembers: Member[] = [
  {
    id: 'demo-member-1',
    chapter_id: chapterId,
    name: 'Olivia Harper',
    email: 'olivia@alpha.edu',
    status: 'Active',
    year: 'Senior',
    duesPaid: true,
    paymentDate: '2025-01-06T12:00:00Z',
    semester: 'Winter 2025',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'demo-member-2',
    chapter_id: chapterId,
    name: 'Isaac Martinez',
    email: 'isaac@alpha.edu',
    status: 'Active',
    year: 'Junior',
    duesPaid: false,
    paymentDate: null,
    semester: 'Winter 2025',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'demo-member-3',
    chapter_id: chapterId,
    name: 'Avery Johnson',
    email: 'avery@alpha.edu',
    status: 'Active',
    year: 'Sophomore',
    duesPaid: false,
    paymentDate: null,
    semester: 'Winter 2025',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'demo-member-4',
    chapter_id: chapterId,
    name: 'Gavin Patel',
    email: 'gavin@alpha.edu',
    status: 'Active',
    year: 'Senior',
    duesPaid: true,
    paymentDate: '2025-01-09T12:00:00Z',
    semester: 'Winter 2025',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'demo-member-5',
    chapter_id: chapterId,
    name: 'Mila Thompson',
    email: 'mila@alpha.edu',
    status: 'Active',
    year: 'Junior',
    duesPaid: false,
    paymentDate: null,
    semester: 'Winter 2025',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'demo-member-6',
    chapter_id: chapterId,
    name: 'Noah Brooks',
    email: 'noah@alpha.edu',
    status: 'Active',
    year: 'Freshman',
    duesPaid: false,
    paymentDate: null,
    semester: 'Winter 2025',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'demo-member-7',
    chapter_id: chapterId,
    name: 'Harper Lee',
    email: 'harper@alpha.edu',
    status: 'Exec',
    year: 'Senior',
    duesPaid: true,
    paymentDate: '2025-01-18T12:00:00Z',
    semester: 'Winter 2025',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'demo-member-8',
    chapter_id: chapterId,
    name: 'Lena Ortiz',
    email: 'lena@alpha.edu',
    status: 'Active',
    year: 'Sophomore',
    duesPaid: false,
    paymentDate: null,
    semester: 'Winter 2025',
    lastUpdated: new Date().toISOString()
  }
];

const demoRecurring: RecurringTransaction[] = [
  {
    id: 'demo-recurring-1',
    chapter_id: chapterId,
    name: 'Facility lease',
    description: 'Monthly lease for chapter facility',
    amount: -2800,
    frequency: 'monthly',
    next_due_date: '2025-07-01',
    category_id: 'demo-cat-2',
    period_id: periodId,
    payment_method: 'ACH',
    auto_post: true,
    is_active: true,
    created_by: 'demo-user-id'
  },
  {
    id: 'demo-recurring-2',
    chapter_id: chapterId,
    name: 'Member dues draft',
    description: 'Automatic ACH pull for dues',
    amount: 7200,
    frequency: 'monthly',
    next_due_date: '2025-07-05',
    category_id: null,
    period_id: periodId,
    payment_method: 'ACH',
    auto_post: true,
    is_active: true,
    created_by: 'demo-user-id'
  }
];

const plaidConnectionId = 'demo-conn-1';

const demoPlaidConnections: PlaidConnectionWithDetails[] = [
  {
    id: plaidConnectionId,
    chapter_id: chapterId,
    institution_name: 'Chase Business',
    institution_id: 'ins_123',
    access_token: 'demo-access-token',
    item_id: 'item_demo_1',
    cursor: null,
    last_synced_at: new Date().toISOString(),
    is_active: true,
    error_code: null,
    error_message: null,
    created_by: 'demo-user-id',
    account_count: 2,
    total_balance: 39500.42
  },
  {
    id: 'demo-conn-2',
    chapter_id: chapterId,
    institution_name: 'Stripe',
    institution_id: 'ins_456',
    access_token: 'demo-access-token-2',
    item_id: 'item_demo_2',
    cursor: null,
    last_synced_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    error_code: 'ITEM_LOGIN_REQUIRED',
    error_message: 'Re-authentication required to continue syncing.',
    created_by: 'demo-user-id',
    account_count: 1,
    total_balance: 1050
  }
];

const demoPlaidAccounts: Record<string, PlaidAccount[]> = {
  [plaidConnectionId]: [
    {
      id: 'demo-account-1',
      connection_id: plaidConnectionId,
      chapter_id: chapterId,
      account_id: 'account_demo_1',
      account_name: 'Operations Checking',
      official_name: 'Business Checking',
      account_type: 'depository',
      account_subtype: 'checking',
      mask: '4821',
      verification_status: 'verified',
      current_balance: 32000.23,
      available_balance: 31340.11,
      iso_currency_code: 'USD',
      last_balance_update: new Date().toISOString(),
      is_active: true
    },
    {
      id: 'demo-account-2',
      connection_id: plaidConnectionId,
      chapter_id: chapterId,
      account_id: 'account_demo_2',
      account_name: 'Events Savings',
      official_name: 'High Yield Savings',
      account_type: 'depository',
      account_subtype: 'savings',
      mask: '9012',
      verification_status: 'verified',
      current_balance: 7500.19,
      available_balance: 7500.19,
      iso_currency_code: 'USD',
      last_balance_update: new Date().toISOString(),
      is_active: true
    }
  ],
  'demo-conn-2': [
    {
      id: 'demo-account-3',
      connection_id: 'demo-conn-2',
      chapter_id: chapterId,
      account_id: 'account_demo_3',
      account_name: 'Stripe Payments Balance',
      official_name: 'Stripe Balance',
      account_type: 'other',
      account_subtype: 'payments',
      mask: '0000',
      verification_status: 'pending_automatic_verification',
      current_balance: 1050,
      available_balance: 1050,
      iso_currency_code: 'USD',
      last_balance_update: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      is_active: true
    }
  ]
};

const demoPlaidLog: PlaidSyncLogEntry[] = [
  {
    id: 'sync-2318',
    time: 'Today • 8:15 AM',
    detail: 'Imported 42 transactions from Chase Business',
    status: 'success'
  },
  {
    id: 'sync-2317',
    time: 'Yesterday • 4:20 PM',
    detail: 'Stripe balance refreshed',
    status: 'info'
  },
  {
    id: 'sync-2316',
    time: 'Yesterday • 9:05 AM',
    detail: 'Bank of America connection requires MFA code',
    status: 'warning'
  }
];

const initialState: DemoState = {
  chapter: demoChapter,
  chapters: [demoChapter],
  transactions: demoTransactions,
  budgets: demoBudgets,
  budgetCategories: demoBudgetCategories,
  budgetPeriods: demoBudgetPeriods,
  budgetSummary: demoBudgetSummary,
  expenses: demoExpenses,
  members: demoMembers,
  recurring: demoRecurring,
  plaidConnections: demoPlaidConnections,
  plaidAccounts: demoPlaidAccounts,
  plaidLog: demoPlaidLog
};


type Listener = () => void;

class DemoStore {
  private state: DemoState;
  private listeners: Set<Listener> = new Set();

  constructor(initial: DemoState) {
    this.state = initial;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): DemoState {
    return this.state;
  }

  setState(partial: Partial<DemoState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit() {
    this.listeners.forEach(listener => listener());
  }

  updateTransactions(updater: (transactions: Transaction[]) => Transaction[]) {
    this.state = { ...this.state, transactions: updater(this.state.transactions) };
    this.emit();
  }

  updateBudgets(updater: (budgets: Budget[]) => Budget[]) {
    this.state = { ...this.state, budgets: updater(this.state.budgets) };
    this.emit();
  }

  updateBudgetSummary(updater: (summary: BudgetSummary[]) => BudgetSummary[]) {
    this.state = { ...this.state, budgetSummary: updater(this.state.budgetSummary) };
    this.emit();
  }

  updateMembers(updater: (members: Member[]) => Member[]) {
    this.state = { ...this.state, members: updater(this.state.members) };
    this.emit();
  }

  updatePlaidConnections(updater: (connections: PlaidConnectionWithDetails[]) => PlaidConnectionWithDetails[]) {
    this.state = { ...this.state, plaidConnections: updater(this.state.plaidConnections) };
    this.emit();
  }

  updatePlaidAccounts(connectionId: string, updater: (accounts: PlaidAccount[]) => PlaidAccount[]) {
    const current = this.state.plaidAccounts[connectionId] || [];
    this.state = {
      ...this.state,
      plaidAccounts: {
        ...this.state.plaidAccounts,
        [connectionId]: updater(current)
      }
    };
    this.emit();
  }

  appendPlaidLog(entry: PlaidSyncLogEntry) {
    this.state = {
      ...this.state,
      plaidLog: [entry, ...this.state.plaidLog].slice(0, 20)
    };
    this.emit();
  }
}

export const demoStore = new DemoStore(initialState);

const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export const demoHelpers = {
  chapterId,
  nextId: () => generateId(),
  computeTotalBalance: (transactions: Transaction[]) =>
    transactions.reduce((acc, tx) => acc + tx.amount, 0),
  computeOutstandingDues: (members: Member[], amount = 450) =>
    members
      .filter(member => !member.duesPaid)
      .reduce((acc, member) => acc + amount, 0)
};

export type { DemoState };
