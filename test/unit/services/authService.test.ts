/**
 * AuthService Unit Tests
 *
 * Tests authentication, authorization, and user management functions:
 * - Role checking (hasAdminAccess, hasAdminRole)
 * - Profile update field stripping (security)
 * - CSV/GCM export formatting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockUserProfile,
  mockAdminProfile,
  mockExecProfile
} from '@test/fixtures/payment-fixtures';

// Use vi.hoisted to create mocks that are available during vi.mock hoisting
const mockSupabaseClient = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    refreshSession: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  from: vi.fn(),
  rpc: vi.fn()
}));

// Mock the demo mode check
vi.mock('@/utils/env', () => ({
  isDemoModeEnabled: vi.fn().mockReturnValue(false)
}));

// Mock the yearUtils
vi.mock('@/utils/yearUtils', () => ({
  getYearLabel: vi.fn((year: string) => {
    const labels: Record<string, string> = {
      '1': 'Freshman',
      '2': 'Sophomore',
      '3': 'Junior',
      '4': 'Senior',
      'Graduate': 'Graduate',
      'Alumni': 'Alumni'
    };
    return labels[year] || year;
  })
}));

// Mock supabase client
vi.mock('@/services/supabaseClient', () => ({
  supabase: mockSupabaseClient
}));

// Import after mocks are set up
import { AuthService } from '@/services/authService';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // EXPORT FUNCTIONS - Pure Functions (No Mocks Needed)
  // ============================================================================

  describe('exportMembersToCSV', () => {
    it('generates correct CSV headers', () => {
      const members = [mockUserProfile];
      const csv = AuthService.exportMembersToCSV(members);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Name,Email,Year,Status,Role,Dues Balance');
    });

    it('exports member data correctly', () => {
      const members = [
        { ...mockUserProfile, full_name: 'John Doe', email: 'john@test.com', year: '3' as const, status: 'active' as const, role: 'member' as const, dues_balance: 500 }
      ];
      const csv = AuthService.exportMembersToCSV(members);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('John Doe');
      expect(lines[1]).toContain('john@test.com');
      expect(lines[1]).toContain('Junior'); // year 3 = Junior
      expect(lines[1]).toContain('active');
      expect(lines[1]).toContain('member');
      expect(lines[1]).toContain('500.00');
    });

    it('handles empty member list', () => {
      const csv = AuthService.exportMembersToCSV([]);
      const lines = csv.split('\n');

      expect(lines.length).toBe(1); // Just headers
      expect(lines[0]).toBe('Name,Email,Year,Status,Role,Dues Balance');
    });

    it('handles members without year', () => {
      const members = [
        { ...mockUserProfile, year: undefined }
      ];
      const csv = AuthService.exportMembersToCSV(members);
      const lines = csv.split('\n');

      // Should not crash and should have empty year field
      expect(lines.length).toBe(2);
    });

    it('handles members with zero dues balance', () => {
      const members = [
        { ...mockUserProfile, dues_balance: 0 }
      ];
      const csv = AuthService.exportMembersToCSV(members);

      expect(csv).toContain('0.00');
    });

    it('handles null dues balance', () => {
      const members = [
        { ...mockUserProfile, dues_balance: null as any }
      ];
      const csv = AuthService.exportMembersToCSV(members);

      expect(csv).toContain('0.00');
    });

    it('exports multiple members', () => {
      const members = [
        { ...mockUserProfile, full_name: 'Alice', email: 'alice@test.com' },
        { ...mockUserProfile, full_name: 'Bob', email: 'bob@test.com' },
        { ...mockUserProfile, full_name: 'Charlie', email: 'charlie@test.com' }
      ];
      const csv = AuthService.exportMembersToCSV(members);
      const lines = csv.split('\n');

      expect(lines.length).toBe(4); // 1 header + 3 data rows
      expect(lines[1]).toContain('Alice');
      expect(lines[2]).toContain('Bob');
      expect(lines[3]).toContain('Charlie');
    });
  });

  describe('exportMembersToGCM', () => {
    it('generates tab-separated values', () => {
      const members = [mockUserProfile];
      const gcm = AuthService.exportMembersToGCM(members);

      expect(gcm).toContain('\t');
    });

    it('splits full name into first and last name', () => {
      const members = [
        { ...mockUserProfile, full_name: 'John Doe' }
      ];
      const gcm = AuthService.exportMembersToGCM(members);
      const lines = gcm.split('\n');
      const dataRow = lines[1].split('\t');

      expect(dataRow[0]).toBe('John'); // First name
      expect(dataRow[1]).toBe('Doe'); // Last name
    });

    it('handles single name (no last name)', () => {
      const members = [
        { ...mockUserProfile, full_name: 'Madonna' }
      ];
      const gcm = AuthService.exportMembersToGCM(members);
      const lines = gcm.split('\n');
      const dataRow = lines[1].split('\t');

      expect(dataRow[0]).toBe('Madonna');
      expect(dataRow[1]).toBe(''); // Empty last name
    });

    it('handles name with multiple parts', () => {
      const members = [
        { ...mockUserProfile, full_name: 'John Paul Jones' }
      ];
      const gcm = AuthService.exportMembersToGCM(members);
      const lines = gcm.split('\n');
      const dataRow = lines[1].split('\t');

      expect(dataRow[0]).toBe('John');
      expect(dataRow[1]).toBe('Paul Jones'); // Rest of name
    });

    it('includes correct headers', () => {
      const gcm = AuthService.exportMembersToGCM([]);
      const headers = gcm.split('\t');

      expect(headers[0]).toBe('First Name');
      expect(headers[1]).toBe('Last Name');
      expect(headers[2]).toBe('Email');
    });

    it('includes phone number when available', () => {
      const members = [
        { ...mockUserProfile, phone_number: '555-123-4567' }
      ];
      const gcm = AuthService.exportMembersToGCM(members);

      expect(gcm).toContain('555-123-4567');
    });

    it('handles missing phone number', () => {
      const members = [
        { ...mockUserProfile, phone_number: undefined }
      ];
      const gcm = AuthService.exportMembersToGCM(members);
      const lines = gcm.split('\n');
      const dataRow = lines[1].split('\t');

      // Last field should be empty
      expect(dataRow[5]).toBe('');
    });
  });

  // ============================================================================
  // ROLE CHECKING TESTS
  // ============================================================================

  describe('hasAdminAccess', () => {
    it('returns true for admin role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id' } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockAdminProfile, role: 'admin' },
          error: null
        })
      });

      const result = await AuthService.hasAdminAccess();
      expect(result).toBe(true);
    });

    it('returns true for exec role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'exec-id' } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockExecProfile, role: 'exec' },
          error: null
        })
      });

      const result = await AuthService.hasAdminAccess();
      expect(result).toBe(true);
    });

    it('returns false for member role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'member-id' } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockUserProfile, role: 'member' },
          error: null
        })
      });

      const result = await AuthService.hasAdminAccess();
      expect(result).toBe(false);
    });

    it('returns false when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthSessionMissingError', message: 'Auth session missing' }
      });

      const result = await AuthService.hasAdminAccess();
      expect(result).toBe(false);
    });

    it('returns false when profile fetch fails', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile not found' }
        })
      });

      const result = await AuthService.hasAdminAccess();
      expect(result).toBe(false);
    });
  });

  describe('hasAdminRole', () => {
    it('returns true only for admin role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id' } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockAdminProfile, role: 'admin' },
          error: null
        })
      });

      const result = await AuthService.hasAdminRole();
      expect(result).toBe(true);
    });

    it('returns false for exec role (only admin has admin role)', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'exec-id' } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockExecProfile, role: 'exec' },
          error: null
        })
      });

      const result = await AuthService.hasAdminRole();
      expect(result).toBe(false);
    });

    it('returns false for member role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'member-id' } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockUserProfile, role: 'member' },
          error: null
        })
      });

      const result = await AuthService.hasAdminRole();
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // PROFILE UPDATE SECURITY TESTS
  // ============================================================================

  describe('updateUserProfile', () => {
    it('strips protected fields from updates', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null
      });

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockUserProfile, full_name: 'New Name' },
          error: null
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      await AuthService.updateUserProfile({
        full_name: 'New Name',
        role: 'admin', // Should be stripped
        dues_balance: 0, // Should be stripped
        id: 'fake-id', // Should be stripped
        created_at: 'fake-date', // Should be stripped
        updated_at: 'fake-date' // Should be stripped
      });

      // Verify update was called
      expect(mockUpdateChain.update).toHaveBeenCalled();

      // Get the argument passed to update()
      const updateArg = mockUpdateChain.update.mock.calls[0][0];

      // Protected fields should NOT be in the update
      expect(updateArg).not.toHaveProperty('role');
      expect(updateArg).not.toHaveProperty('dues_balance');
      expect(updateArg).not.toHaveProperty('id');
      expect(updateArg).not.toHaveProperty('created_at');
      expect(updateArg).not.toHaveProperty('updated_at');

      // Allowed fields should be present
      expect(updateArg).toHaveProperty('full_name', 'New Name');
    });

    it('allows updating phone_number', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null
      });

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockUserProfile, phone_number: '555-999-8888' },
          error: null
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      await AuthService.updateUserProfile({
        phone_number: '555-999-8888'
      });

      const updateArg = mockUpdateChain.update.mock.calls[0][0];
      expect(updateArg).toHaveProperty('phone_number', '555-999-8888');
    });

    it('allows updating major', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null
      });

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockUserProfile, major: 'Engineering' },
          error: null
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      await AuthService.updateUserProfile({
        major: 'Engineering'
      });

      const updateArg = mockUpdateChain.update.mock.calls[0][0];
      expect(updateArg).toHaveProperty('major', 'Engineering');
    });

    it('returns error when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthSessionMissingError', message: 'Auth session missing' }
      });

      const result = await AuthService.updateUserProfile({
        full_name: 'New Name'
      });

      expect(result.error).not.toBeNull();
      expect(result.profile).toBeNull();
    });
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================

  describe('signIn', () => {
    it('calls signInWithPassword with correct credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-id', email: 'test@example.com' } },
        error: null
      });

      const result = await AuthService.signIn({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result.user).not.toBeNull();
      expect(result.error).toBeNull();
    });

    it('returns error on invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' }
      });

      const result = await AuthService.signIn({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      });

      expect(result.user).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await AuthService.signOut();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('calls resetPasswordForEmail with email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await AuthService.resetPassword('test@example.com');

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
      expect(result.error).toBeNull();
    });
  });

  // ============================================================================
  // CURRENT USER TESTS
  // ============================================================================

  describe('getCurrentUser', () => {
    it('returns user when authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-id', email: 'test@example.com' } },
        error: null
      });

      const user = await AuthService.getCurrentUser();

      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-id');
    });

    it('returns null when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthSessionMissingError', message: 'Auth session missing' }
      });

      const user = await AuthService.getCurrentUser();

      expect(user).toBeNull();
    });

    it('handles AuthSessionMissingError gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthSessionMissingError', message: 'Auth session missing' }
      });

      // Should not throw
      const user = await AuthService.getCurrentUser();
      expect(user).toBeNull();
    });
  });
});
