import { AIMessage, AIConversation, AIInsight } from '../../src/services/aiService';

export const mockChapterId = 'chapter-123';
export const mockUserId = 'user-123';

export const mockTransactions = [
  {
    id: 'txn-1',
    chapter_id: mockChapterId,
    description: 'Chipotle catering',
    amount: 450.00,
    transaction_date: '2025-01-10',
    category_id: 'cat-food',
    category_name: 'Food & Dining',
    payment_method: 'Credit Card',
    source: 'manual',
    vendor: 'Chipotle',
    status: 'completed'
  },
  {
    id: 'txn-2',
    chapter_id: mockChapterId,
    description: 'DJ Service',
    amount: 800.00,
    transaction_date: '2025-01-08',
    category_id: 'cat-events',
    category_name: 'Event Expenses',
    payment_method: 'Check',
    source: 'manual',
    vendor: 'DJ Pro',
    status: 'completed'
  },
  {
    id: 'txn-3',
    chapter_id: mockChapterId,
    description: 'Office supplies',
    amount: 125.50,
    transaction_date: '2025-01-05',
    category_id: 'cat-office',
    category_name: 'Office Supplies',
    payment_method: 'Credit Card',
    source: 'plaid',
    status: 'completed'
  }
];

export const mockBudgets = [
  {
    budget_id: 'budget-1',
    chapter_id: mockChapterId,
    category: 'Food & Dining',
    category_id: 'cat-food',
    category_type: 'expense',
    allocated: 2000.00,
    spent: 1800.00,
    remaining: 200.00,
    percent_used: 90.0,
    period: 'Q1',
    fiscal_year: '2025',
    start_date: '2025-01-01',
    end_date: '2025-03-31'
  },
  {
    budget_id: 'budget-2',
    chapter_id: mockChapterId,
    category: 'Event Expenses',
    category_id: 'cat-events',
    category_type: 'expense',
    allocated: 5000.00,
    spent: 5200.00,
    remaining: -200.00,
    percent_used: 104.0,
    period: 'Q1',
    fiscal_year: '2025',
    start_date: '2025-01-01',
    end_date: '2025-03-31'
  },
  {
    budget_id: 'budget-3',
    chapter_id: mockChapterId,
    category: 'Office Supplies',
    category_id: 'cat-office',
    category_type: 'expense',
    allocated: 1000.00,
    spent: 250.00,
    remaining: 750.00,
    percent_used: 25.0,
    period: 'Q1',
    fiscal_year: '2025',
    start_date: '2025-01-01',
    end_date: '2025-03-31'
  }
];

export const mockRecurringTransactions = [
  {
    id: 'rec-1',
    chapter_id: mockChapterId,
    name: 'Monthly utilities',
    description: 'Electric and water',
    amount: -250.00,
    frequency: 'monthly',
    next_due_date: '2025-02-01',
    is_active: true,
    auto_post: true,
    budget_categories: { name: 'Fixed Costs' }
  },
  {
    id: 'rec-2',
    chapter_id: mockChapterId,
    name: 'National dues',
    description: 'Quarterly national chapter fees',
    amount: -150.00,
    frequency: 'quarterly',
    next_due_date: '2025-02-05',
    is_active: true,
    auto_post: false,
    budget_categories: { name: 'Membership Dues' }
  }
];

export const mockPlaidAccounts = [
  {
    id: 'plaid-1',
    chapter_id: mockChapterId,
    account_id: 'acc-1',
    account_name: 'Chapter Checking',
    current_balance: 12450.75,
    available_balance: 12450.75,
    is_active: true
  }
];

export const mockConversations: AIConversation[] = [
  {
    id: 'conv-1',
    title: 'Budget analysis for Q1',
    started_at: '2025-01-10T10:00:00Z',
    last_message_at: '2025-01-10T10:15:00Z',
    message_count: 5
  },
  {
    id: 'conv-2',
    title: 'Help with event planning',
    started_at: '2025-01-09T14:00:00Z',
    last_message_at: '2025-01-09T14:30:00Z',
    message_count: 8
  }
];

export const mockMessages: AIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'What is our current budget status?',
    created_at: '2025-01-10T10:00:00Z'
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Your current budget status shows you are slightly over in Event Expenses ($5,200 spent of $5,000 allocated) but under budget in other categories.',
    created_at: '2025-01-10T10:00:30Z',
    tokens_used: 150
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'How much have we spent on food?',
    created_at: '2025-01-10T10:05:00Z'
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: 'You have spent $1,800 on Food & Dining, which is 90% of your $2,000 budget for Q1.',
    created_at: '2025-01-10T10:05:30Z',
    tokens_used: 120
  }
];

export const mockInsights: AIInsight[] = [
  {
    id: 'insight-1',
    insight_type: 'budget_warning',
    title: 'Event Expenses is over budget',
    description: 'You have spent $5,200 of $5,000 allocated (104.0%). You are $200 over budget for Q1.',
    priority: 'high',
    created_at: '2025-01-10T09:00:00Z',
    suggested_actions: [
      { text: 'Review recent transactions in this category', action: 'view_transactions' },
      { text: 'Reduce spending in this category', action: 'reduce_spending' }
    ],
    related_data: {
      category: 'Event Expenses',
      allocated: 5000,
      spent: 5200,
      overage: 200
    }
  },
  {
    id: 'insight-2',
    insight_type: 'optimization',
    title: 'Office Supplies has $750 unused',
    description: 'You have only used 25.0% of your Office Supplies budget. Consider reallocating $750 to categories that need more funding.',
    priority: 'low',
    created_at: '2025-01-10T09:00:00Z',
    suggested_actions: [
      { text: 'Reallocate to over-budget categories', action: 'reallocate_budget' },
      { text: 'Review if allocation is too high', action: 'review_budget' }
    ],
    related_data: {
      category: 'Office Supplies',
      allocated: 1000,
      spent: 250,
      unused: 750
    }
  },
  {
    id: 'insight-3',
    insight_type: 'alert',
    title: '2 recurring payments due this week',
    description: 'Total: $400.00. Monthly utilities: $250.00 due 2025-02-01, National dues: $150.00 due 2025-02-05',
    priority: 'low',
    created_at: '2025-01-10T09:00:00Z',
    suggested_actions: [
      { text: 'View all recurring payments', action: 'view_recurring' },
      { text: 'Ensure sufficient funds', action: 'check_balance' }
    ],
    related_data: {
      count: 2,
      total: 400
    }
  }
];

export const mockKnowledgeBase = [
  {
    id: 'kb-1',
    chapter_id: mockChapterId,
    content: 'Food & Dining transaction: Chipotle catering for 450.00 USD on 01/10/2025. Payment method: Credit Card. Source: manual.',
    embedding: Array(1536).fill(0).map(() => Math.random()),
    content_type: 'transaction',
    source_table: 'expenses',
    source_id: 'txn-1',
    source_metadata: {
      amount: 450.00,
      category: 'Food & Dining',
      date: '2025-01-10',
      vendor: 'Chipotle'
    },
    is_active: true,
    created_at: '2025-01-10T08:00:00Z'
  },
  {
    id: 'kb-2',
    chapter_id: mockChapterId,
    content: 'Food & Dining budget for Q1 2025: 2000.00 USD allocated, 1800.00 USD spent (90.0% used), 200.00 USD remaining. Status: nearly at budget.',
    embedding: Array(1536).fill(0).map(() => Math.random()),
    content_type: 'budget',
    source_table: 'budgets',
    source_id: 'budget-1',
    source_metadata: {
      category: 'Food & Dining',
      period: 'Q1',
      allocated: 2000,
      spent: 1800,
      percent_used: 90
    },
    is_active: true,
    created_at: '2025-01-10T08:00:00Z'
  }
];

export const mockDuesStats = {
  chapter_id: mockChapterId,
  period_name: 'Spring',
  fiscal_year: '2025',
  total_members: 45,
  members_paid: 40,
  members_pending: 3,
  members_overdue: 2,
  payment_rate: 88.9,
  total_expected: 22500.00,
  total_collected: 20000.00,
  total_outstanding: 2500.00,
  total_late_fees: 100.00
};

// Embedding vectors (mock, normally 1536 dimensions)
export const createMockEmbedding = (): number[] => {
  return Array(1536).fill(0).map(() => Math.random());
};

// Context items returned by vector search
export const mockContextItems = [
  {
    id: 'kb-1',
    content: mockKnowledgeBase[0].content,
    content_type: 'transaction',
    similarity: 0.92,
    source_metadata: mockKnowledgeBase[0].source_metadata
  },
  {
    id: 'kb-2',
    content: mockKnowledgeBase[1].content,
    content_type: 'budget',
    similarity: 0.87,
    source_metadata: mockKnowledgeBase[1].source_metadata
  }
];
