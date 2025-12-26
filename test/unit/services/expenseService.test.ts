/**
 * ExpenseService Unit Tests
 *
 * Tests expense/transaction management:
 * - Expense statistics calculation
 * - Budget totals by period
 * - CRUD operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mocks
const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn()
}));

vi.mock('@/services/supabaseClient', () => ({
  supabase: mockSupabaseClient
}));

vi.mock('@/utils/env', () => ({
  isDemoModeEnabled: vi.fn().mockReturnValue(false)
}));

import { ExpenseService } from '@/services/expenseService';

// Mock expense data
const mockExpenses = [
  {
    id: 'exp-1',
    chapter_id: 'chapter-1',
    amount: 100,
    status: 'completed',
    category_name: 'Food',
    category_id: 'cat-1',
    transaction_date: '2025-01-15',
    transaction_type: 'expense'
  },
  {
    id: 'exp-2',
    chapter_id: 'chapter-1',
    amount: 200,
    status: 'completed',
    category_name: 'Food',
    category_id: 'cat-1',
    transaction_date: '2025-01-16',
    transaction_type: 'expense'
  },
  {
    id: 'exp-3',
    chapter_id: 'chapter-1',
    amount: 500,
    status: 'pending',
    category_name: 'Events',
    category_id: 'cat-2',
    transaction_date: '2025-01-17',
    transaction_type: 'expense'
  },
  {
    id: 'exp-4',
    chapter_id: 'chapter-1',
    amount: 50,
    status: 'cancelled',
    category_name: 'Supplies',
    category_id: 'cat-3',
    transaction_date: '2025-01-18',
    transaction_type: 'expense'
  }
];

const mockBudgetSummary = [
  {
    chapter_id: 'chapter-1',
    category: 'Food & Dining',
    category_type: 'Fixed Costs',
    allocated: 500,
    spent: 300,
    remaining: 200,
    period: 'Spring 2025'
  },
  {
    chapter_id: 'chapter-1',
    category: 'Events',
    category_type: 'Event Costs',
    allocated: 1000,
    spent: 500,
    remaining: 500,
    period: 'Spring 2025'
  },
  {
    chapter_id: 'chapter-1',
    category: 'Operations',
    category_type: 'Operational Costs',
    allocated: 300,
    spent: 150,
    remaining: 150,
    period: 'Spring 2025'
  }
];

describe('ExpenseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET EXPENSES
  // ============================================================================

  describe('getExpenses', () => {
    it('returns expenses for a chapter', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: mockExpenses,
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getExpenses('chapter-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('expense_details');
      expect(result).toHaveLength(4);
    });

    it('returns empty array when chapterId is missing', async () => {
      const result = await ExpenseService.getExpenses('');

      expect(result).toEqual([]);
    });

    it('returns empty array on error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: null,
          error: { message: 'Database error' }
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getExpenses('chapter-1');

      expect(result).toEqual([]);
    });

    it('applies period filter when provided', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: mockExpenses,
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      await ExpenseService.getExpenses('chapter-1', { periodId: 'period-1' });

      // eq should be called for chapter_id and period_id
      expect(mockChain.eq).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GET SINGLE EXPENSE
  // ============================================================================

  describe('getExpense', () => {
    it('returns expense by id', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExpenses[0],
          error: null
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getExpense('exp-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('exp-1');
    });

    it('returns null on error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getExpense('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // EXPENSE CRUD
  // ============================================================================

  describe('addExpense', () => {
    it('creates new expense', async () => {
      const newExpense = {
        amount: 150,
        description: 'Test expense',
        category_id: 'cat-1',
        transaction_date: '2025-01-20',
        status: 'completed' as const
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-exp', chapter_id: 'chapter-1', ...newExpense },
          error: null
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.addExpense('chapter-1', newExpense);

      expect(result.id).toBe('new-exp');
      expect(mockChain.insert).toHaveBeenCalled();
    });

    it('throws error when chapterId is missing', async () => {
      const newExpense = {
        amount: 150,
        description: 'Test expense',
        category_id: 'cat-1',
        transaction_date: '2025-01-20',
        status: 'completed' as const
      };

      await expect(ExpenseService.addExpense('', newExpense)).rejects.toThrow('Chapter ID is required');
    });
  });

  describe('updateExpense', () => {
    it('updates existing expense', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockExpenses[0], amount: 999 },
          error: null
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.updateExpense('exp-1', { amount: 999 });

      expect(result.amount).toBe(999);
    });
  });

  describe('deleteExpense', () => {
    it('deletes expense and returns true', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.deleteExpense('exp-1');

      expect(result).toBe(true);
    });

    it('throws on delete error', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      await expect(ExpenseService.deleteExpense('exp-1')).rejects.toThrow();
    });
  });

  // ============================================================================
  // BUDGET CATEGORIES
  // ============================================================================

  describe('getCategories', () => {
    it('returns categories for a chapter', async () => {
      const mockCategories = [
        { id: 'cat-1', chapter_id: 'chapter-1', name: 'Food', type: 'Fixed Costs', is_active: true },
        { id: 'cat-2', chapter_id: 'chapter-1', name: 'Events', type: 'Event Costs', is_active: true }
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: mockCategories,
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getCategories('chapter-1');

      expect(result).toHaveLength(2);
    });

    it('returns empty array when chapterId is missing', async () => {
      const result = await ExpenseService.getCategories('');

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // BUDGET PERIODS
  // ============================================================================

  describe('getCurrentPeriod', () => {
    it('returns current period', async () => {
      const mockPeriod = {
        id: 'period-1',
        chapter_id: 'chapter-1',
        name: 'Spring 2025',
        is_current: true
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPeriod,
          error: null
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getCurrentPeriod('chapter-1');

      expect(result).not.toBeNull();
      expect(result?.is_current).toBe(true);
    });

    it('returns null when no current period', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getCurrentPeriod('chapter-1');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // BUDGET SUMMARY & ANALYTICS
  // ============================================================================

  describe('getBudgetSummary', () => {
    it('returns budget summary for chapter', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: mockBudgetSummary,
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getBudgetSummary('chapter-1');

      expect(result).toHaveLength(3);
    });

    it('filters by period name', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: mockBudgetSummary,
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      await ExpenseService.getBudgetSummary('chapter-1', 'Spring 2025');

      expect(mockChain.eq).toHaveBeenCalled();
    });
  });

  describe('getTotalsByPeriod', () => {
    it('calculates totals correctly', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: mockBudgetSummary,
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getTotalsByPeriod('chapter-1', 'Spring 2025');

      // Check Fixed Costs
      expect(result['Fixed Costs'].allocated).toBe(500);
      expect(result['Fixed Costs'].spent).toBe(300);
      expect(result['Fixed Costs'].remaining).toBe(200);

      // Check Event Costs
      expect(result['Event Costs'].allocated).toBe(1000);
      expect(result['Event Costs'].spent).toBe(500);
      expect(result['Event Costs'].remaining).toBe(500);

      // Check Operational Costs
      expect(result['Operational Costs'].allocated).toBe(300);
      expect(result['Operational Costs'].spent).toBe(150);
      expect(result['Operational Costs'].remaining).toBe(150);

      // Check Grand Total
      expect(result['Grand Total'].allocated).toBe(1800);
      expect(result['Grand Total'].spent).toBe(950);
      expect(result['Grand Total'].remaining).toBe(850);
    });

    it('returns zeros when chapterId is missing', async () => {
      const result = await ExpenseService.getTotalsByPeriod('', 'Spring 2025');

      expect(result['Grand Total'].allocated).toBe(0);
      expect(result['Grand Total'].spent).toBe(0);
      expect(result['Grand Total'].remaining).toBe(0);
    });
  });

  describe('getExpenseStats', () => {
    it('calculates expense statistics', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: mockExpenses,
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getExpenseStats('chapter-1');

      expect(result.total).toBe(4);
      expect(result.totalAmount).toBe(850); // 100 + 200 + 500 + 50
      expect(result.pending).toBe(1);
      expect(result.completed).toBe(2);
      expect(result.cancelled).toBe(1);
      expect(result.averageAmount).toBe(212.5); // 850 / 4
    });

    it('groups expenses by category', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: mockExpenses,
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getExpenseStats('chapter-1');

      expect(result.byCategory['Food'].count).toBe(2);
      expect(result.byCategory['Food'].total).toBe(300); // 100 + 200
      expect(result.byCategory['Events'].count).toBe(1);
      expect(result.byCategory['Events'].total).toBe(500);
      expect(result.byCategory['Supplies'].count).toBe(1);
      expect(result.byCategory['Supplies'].total).toBe(50);
    });

    it('handles empty expense list', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: [],
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.getExpenseStats('chapter-1');

      expect(result.total).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.averageAmount).toBe(0);
      expect(Object.keys(result.byCategory)).toHaveLength(0);
    });
  });

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  describe('isBudgetInitialized', () => {
    it('returns true when both categories and periods exist', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: [{ id: 'test' }],
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await ExpenseService.isBudgetInitialized('chapter-1');

      expect(result).toBe(true);
    });

    it('returns false when categories empty', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn((cb) => Promise.resolve(cb({
            data: table === 'budget_categories' ? [] : [{ id: 'period' }],
            error: null
          })))
        };
        return mockChain;
      });

      const result = await ExpenseService.isBudgetInitialized('chapter-1');

      expect(result).toBe(false);
    });
  });
});
