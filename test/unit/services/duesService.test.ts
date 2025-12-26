/**
 * DuesService Unit Tests
 *
 * Tests dues management functionality:
 * - Dues assignment (new and additive)
 * - Payment recording
 * - Status transitions
 * - CSV export
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockMemberDues,
  mockMemberDuesPartial,
  mockMemberDuesSummary,
  mockDuesConfiguration,
  mockChapterId,
  mockMemberId,
  mockConfigId
} from '@test/fixtures/payment-fixtures';

// Use vi.hoisted for mock that's used during module load
const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn()
}));

vi.mock('@/services/supabaseClient', () => ({
  supabase: mockSupabaseClient
}));

import { DuesService } from '@/services/duesService';

describe('DuesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // EXPORT FUNCTION TESTS - Pure Function (No Mocks Needed)
  // ============================================================================

  describe('exportToCSV', () => {
    const mockSummaryData = [
      {
        ...mockMemberDuesSummary,
        member_name: 'John Doe',
        member_email: 'john@test.com',
        member_year: 'Junior',
        member_status: 'active',
        period_name: 'Spring 2025',
        base_amount: 500,
        late_fee: 0,
        adjustments: 0,
        total_amount: 500,
        amount_paid: 200,
        balance: 300,
        due_date: '2025-02-15',
        paid_date: null,
        status: 'partial',
        is_overdue: false,
        days_overdue: 0
      }
    ];

    it('generates correct CSV headers', () => {
      const csv = DuesService.exportToCSV(mockSummaryData);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Name');
      expect(lines[0]).toContain('Email');
      expect(lines[0]).toContain('Year');
      expect(lines[0]).toContain('Status');
      expect(lines[0]).toContain('Period');
      expect(lines[0]).toContain('Base Amount');
      expect(lines[0]).toContain('Late Fee');
      expect(lines[0]).toContain('Total Amount');
      expect(lines[0]).toContain('Balance');
    });

    it('exports member data correctly', () => {
      const csv = DuesService.exportToCSV(mockSummaryData);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('John Doe');
      expect(lines[1]).toContain('john@test.com');
      expect(lines[1]).toContain('Junior');
      expect(lines[1]).toContain('Spring 2025');
      expect(lines[1]).toContain('500.00');
      expect(lines[1]).toContain('200.00');
      expect(lines[1]).toContain('300.00');
    });

    it('handles empty data', () => {
      const csv = DuesService.exportToCSV([]);
      const lines = csv.split('\n');

      expect(lines.length).toBe(1); // Just headers
    });

    it('formats amounts with 2 decimal places', () => {
      const data = [{
        ...mockMemberDuesSummary,
        base_amount: 100.5,
        late_fee: 25.333,
        adjustments: -10.1,
        total_amount: 115.73,
        amount_paid: 50.001,
        balance: 65.729
      }];

      const csv = DuesService.exportToCSV(data);

      expect(csv).toContain('100.50');
      expect(csv).toContain('25.33');
      expect(csv).toContain('-10.10');
      expect(csv).toContain('115.73');
      expect(csv).toContain('50.00');
      expect(csv).toContain('65.73');
    });

    it('handles null dates', () => {
      const data = [{
        ...mockMemberDuesSummary,
        due_date: null,
        paid_date: null
      }];

      const csv = DuesService.exportToCSV(data);
      // Should not throw and should have empty fields for dates
      expect(csv).toBeDefined();
    });

    it('handles overdue members', () => {
      const data = [{
        ...mockMemberDuesSummary,
        is_overdue: true,
        days_overdue: 15,
        status: 'overdue'
      }];

      const csv = DuesService.exportToCSV(data);

      expect(csv).toContain('overdue');
      expect(csv).toContain('15');
    });

    it('escapes commas in names', () => {
      const data = [{
        ...mockMemberDuesSummary,
        member_name: 'Doe, John'
      }];

      const csv = DuesService.exportToCSV(data);

      // Name with comma should be quoted
      expect(csv).toContain('"Doe, John"');
    });

    it('exports multiple members', () => {
      const data = [
        { ...mockMemberDuesSummary, member_name: 'Alice', member_email: 'alice@test.com' },
        { ...mockMemberDuesSummary, member_name: 'Bob', member_email: 'bob@test.com' },
        { ...mockMemberDuesSummary, member_name: 'Charlie', member_email: 'charlie@test.com' }
      ];

      const csv = DuesService.exportToCSV(data);
      const lines = csv.split('\n');

      expect(lines.length).toBe(4); // 1 header + 3 data rows
    });
  });

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  describe('getConfigurations', () => {
    it('returns configurations for a chapter', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: [mockDuesConfiguration],
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await DuesService.getConfigurations(mockChapterId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('dues_configuration');
      expect(result).toHaveLength(1);
      expect(result[0].period_name).toBe('Spring 2025');
    });

    it('returns empty array on error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: null,
          error: { message: 'Database error' }
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await DuesService.getConfigurations(mockChapterId);

      expect(result).toEqual([]);
    });
  });

  describe('getCurrentConfiguration', () => {
    it('returns current configuration', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDuesConfiguration,
          error: null
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await DuesService.getCurrentConfiguration(mockChapterId);

      expect(result).not.toBeNull();
      expect(result?.is_current).toBe(true);
    });

    it('returns null when no current configuration', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' } // No rows
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await DuesService.getCurrentConfiguration(mockChapterId);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // MEMBER DUES ASSIGNMENT TESTS
  // ============================================================================

  describe('assignDuesToMember', () => {
    it('creates new dues when none exist', async () => {
      // First call: check if exists (returns null)
      // Second call: insert new record
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockMemberDues,
            base_amount: 500,
            total_amount: 500,
            balance: 500,
            status: 'pending'
          },
          error: null
        })
      };

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain;
        return mockInsertChain;
      });

      const result = await DuesService.assignDuesToMember(
        mockChapterId,
        mockMemberId,
        mockConfigId,
        500
      );

      expect(result.base_amount).toBe(500);
      expect(result.status).toBe('pending');
    });

    it('adds to existing dues when already assigned', async () => {
      // Existing dues: $500 base, $100 paid, $400 balance
      const existingDues = {
        id: 'existing-dues-id',
        base_amount: 500,
        late_fee: 0,
        adjustments: 0,
        amount_paid: 100
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingDues,
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'existing-dues-id',
            base_amount: 700, // 500 + 200 new
            total_amount: 700,
            balance: 600, // 700 - 100 paid
            status: 'partial',
            amount_paid: 100
          },
          error: null
        })
      };

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain;
        return mockUpdateChain;
      });

      const result = await DuesService.assignDuesToMember(
        mockChapterId,
        mockMemberId,
        mockConfigId,
        200 // Adding $200 more
      );

      expect(result.base_amount).toBe(700);
      expect(result.balance).toBe(600);
      expect(result.status).toBe('partial');
    });

    it('calculates correct status based on payment', async () => {
      // Test: fully paid = 'paid', partial payment = 'partial', no payment = 'pending'
      const existingDues = {
        id: 'existing-dues-id',
        base_amount: 100,
        late_fee: 0,
        adjustments: 0,
        amount_paid: 100 // Fully paid
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingDues,
          error: null
        })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'existing-dues-id',
            base_amount: 200, // 100 + 100 new
            total_amount: 200,
            balance: 100, // 200 - 100 paid
            status: 'partial', // Was paid, now partial after adding more dues
            amount_paid: 100
          },
          error: null
        })
      };

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSelectChain;
        return mockUpdateChain;
      });

      const result = await DuesService.assignDuesToMember(
        mockChapterId,
        mockMemberId,
        mockConfigId,
        100
      );

      expect(result.status).toBe('partial');
    });
  });

  // ============================================================================
  // PAYMENT RECORDING TESTS
  // ============================================================================

  describe('recordPayment', () => {
    it('records payment via RPC', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: true,
          payment_id: 'new-payment-id',
          new_balance: 300
        },
        error: null
      });

      const result = await DuesService.recordPayment(
        'dues-id',
        200,
        'stripe_card',
        '2025-02-01',
        'ref-123'
      );

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('record_dues_payment', {
        p_member_dues_id: 'dues-id',
        p_amount: 200,
        p_payment_method: 'stripe_card',
        p_payment_date: '2025-02-01',
        p_reference_number: 'ref-123',
        p_notes: null,
        p_recorded_by: null
      });

      expect(result.success).toBe(true);
      expect(result.new_balance).toBe(300);
    });

    it('uses current date if payment date not provided', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { success: true, payment_id: 'new-id', new_balance: 0 },
        error: null
      });

      await DuesService.recordPayment('dues-id', 500);

      const call = mockSupabaseClient.rpc.mock.calls[0];
      expect(call[1].p_payment_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('throws error on RPC failure', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC error' }
      });

      await expect(DuesService.recordPayment('dues-id', 200))
        .rejects.toThrow();
    });
  });

  // ============================================================================
  // AUTOMATED DUES ASSIGNMENT TESTS
  // ============================================================================

  describe('assignDuesToChapter', () => {
    it('calls assign_dues_to_chapter RPC', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: true,
          assigned: 50,
          skipped: 5,
          errors: []
        },
        error: null
      });

      const result = await DuesService.assignDuesToChapter(mockChapterId, mockConfigId);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('assign_dues_to_chapter', {
        p_chapter_id: mockChapterId,
        p_config_id: mockConfigId
      });

      expect(result.success).toBe(true);
      expect(result.assigned).toBe(50);
      expect(result.skipped).toBe(5);
    });
  });

  describe('applyLateFees', () => {
    it('calls apply_late_fees RPC', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: true,
          applied: 10
        },
        error: null
      });

      const result = await DuesService.applyLateFees(mockChapterId, mockConfigId);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('apply_late_fees', {
        p_chapter_id: mockChapterId,
        p_config_id: mockConfigId
      });

      expect(result.success).toBe(true);
      expect(result.applied).toBe(10);
    });
  });

  // ============================================================================
  // STATISTICS & REPORTING TESTS
  // ============================================================================

  describe('getChapterStats', () => {
    it('returns chapter dues statistics', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            chapter_id: mockChapterId,
            total_members: 50,
            members_paid: 35,
            payment_rate: 70
          },
          error: null
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await DuesService.getChapterStats(mockChapterId);

      expect(result).not.toBeNull();
      expect(result?.total_members).toBe(50);
      expect(result?.payment_rate).toBe(70);
    });

    it('returns null when no stats available', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await DuesService.getChapterStats(mockChapterId);

      expect(result).toBeNull();
    });
  });

  describe('getOverdueMembers', () => {
    it('returns overdue members', async () => {
      const overdueMembers = [
        { ...mockMemberDuesSummary, is_overdue: true, days_overdue: 15 },
        { ...mockMemberDuesSummary, is_overdue: true, days_overdue: 30 }
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: overdueMembers,
          error: null
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await DuesService.getOverdueMembers(mockChapterId);

      expect(result).toHaveLength(2);
      expect(result[0].is_overdue).toBe(true);
    });

    it('returns empty array on error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve(cb({
          data: null,
          error: { message: 'Error' }
        })))
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await DuesService.getOverdueMembers(mockChapterId);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  describe('updateMemberDues', () => {
    it('updates dues record', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockMemberDues, notes: 'Updated note' },
          error: null
        })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await DuesService.updateMemberDues('dues-id', { notes: 'Updated note' });

      expect(result.notes).toBe('Updated note');
    });
  });

  describe('deleteMemberDues', () => {
    it('deletes dues record', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      await expect(DuesService.deleteMemberDues('dues-id')).resolves.not.toThrow();
    });

    it('throws on delete error', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
      };
      mockSupabaseClient.from.mockReturnValue(mockChain);

      await expect(DuesService.deleteMemberDues('dues-id')).rejects.toThrow();
    });
  });
});
