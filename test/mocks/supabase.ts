/**
 * Supabase Client Mock
 *
 * Enhanced mock implementation for Supabase client used in service tests.
 * Supports payment flows, dues management, and authentication.
 */

import { vi } from 'vitest';
import {
  mockMemberDues,
  mockMemberDuesSummary,
  mockPaymentIntent,
  mockDuesConfiguration,
  mockDuesPayment,
  mockStripeConnectedAccount,
  mockSavedPaymentMethod,
  mockUserProfile,
  mockAdminProfile,
  mockInstallmentEligibility,
  mockInstallmentPlan,
  mockInstallmentPayments,
  mockChapterDuesStats
} from '../fixtures/payment-fixtures';

// ============================================================================
// BASIC MOCK SUPABASE CLIENT
// ============================================================================

export const createMockSupabaseClient = () => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-access-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'test-user-id', email: 'test@example.com' }
        }
      },
      error: null
    }),
    getUser: vi.fn().mockResolvedValue({
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' }
      },
      error: null
    }),
    refreshSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'refreshed-access-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'test-user-id' }
        }
      },
      error: null
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-id', email: 'new@example.com' } },
      error: null
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })
  },
  from: vi.fn((table: string) => createTableMock(table)),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null })
});

// ============================================================================
// TABLE-SPECIFIC MOCKS
// ============================================================================

const createChainableMock = (defaultData: any = {}) => {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: defaultData, error: null }),
    single: vi.fn().mockResolvedValue({ data: defaultData, error: null }),
    then: vi.fn((callback) =>
      Promise.resolve().then(() =>
        callback({ data: Array.isArray(defaultData) ? defaultData : [defaultData], error: null })
      )
    )
  };
  return mock;
};

const createTableMock = (table: string) => {
  const tableMocks: Record<string, any> = {
    member_dues: createChainableMock(mockMemberDues),
    member_dues_summary: createChainableMock(mockMemberDuesSummary),
    payment_intents: createChainableMock(mockPaymentIntent),
    dues_configuration: createChainableMock(mockDuesConfiguration),
    dues_payments: createChainableMock(mockDuesPayment),
    stripe_connected_accounts: createChainableMock(mockStripeConnectedAccount),
    saved_payment_methods: createChainableMock(mockSavedPaymentMethod),
    user_profiles: createChainableMock(mockUserProfile),
    installment_eligibility: createChainableMock(mockInstallmentEligibility),
    installment_plans: createChainableMock(mockInstallmentPlan),
    installment_payments: createChainableMock(mockInstallmentPayments),
    chapter_dues_stats: createChainableMock(mockChapterDuesStats),
    chapters: createChainableMock({ id: 'chapter-test-123', name: 'Test Chapter' })
  };

  return tableMocks[table] || createChainableMock({});
};

// ============================================================================
// ENHANCED PAYMENT-FOCUSED MOCK
// ============================================================================

export const createPaymentMockSupabaseClient = () => {
  const client = createMockSupabaseClient();

  // Override RPC for payment-specific functions
  client.rpc.mockImplementation((fnName: string, params: any) => {
    const rpcHandlers: Record<string, any> = {
      record_dues_payment: {
        success: true,
        payment_id: 'payment-new-001',
        new_balance: Math.max(0, (params?.p_member_dues_id ? 500 : 0) - (params?.p_amount || 0))
      },
      record_installment_payment: {
        success: true,
        payment_id: 'inst-payment-new-001'
      },
      fail_installment_payment: {
        success: true
      },
      create_installment_plan: {
        success: true,
        plan_id: 'plan-new-001'
      },
      assign_dues_to_chapter: {
        success: true,
        assigned: 50,
        skipped: 0,
        errors: []
      },
      apply_late_fees: {
        success: true,
        applied: 5
      },
      get_chapter_payment_summary: {
        total_collected: 17500,
        total_outstanding: 7500,
        payment_count: 35
      },
      bulk_create_member_invitations: {
        success: true,
        imported_count: params?.p_members?.length || 0,
        skipped_count: 0,
        errors: [],
        message: 'Import successful'
      },
      send_member_invitation_emails: {
        success: true
      }
    };

    const result = rpcHandlers[fnName];
    return Promise.resolve({ data: result || null, error: null });
  });

  return client;
};

// ============================================================================
// AUTH-FOCUSED MOCK
// ============================================================================

export const createAuthMockSupabaseClient = (userProfile = mockUserProfile) => {
  const client = createMockSupabaseClient();

  // Override user profile fetches
  const originalFrom = client.from;
  client.from = vi.fn((table: string) => {
    if (table === 'user_profiles') {
      const mock = createChainableMock(userProfile);
      return mock;
    }
    return originalFrom(table);
  });

  return client;
};

export const createAdminMockSupabaseClient = () => {
  return createAuthMockSupabaseClient(mockAdminProfile);
};

// ============================================================================
// ERROR SIMULATION MOCKS
// ============================================================================

export const createErrorSupabaseClient = (errorMessage = 'Database error') => {
  const client = createMockSupabaseClient();

  // Make all operations return errors
  client.from = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
    then: vi.fn((callback) =>
      Promise.resolve().then(() => callback({ data: null, error: { message: errorMessage } }))
    )
  }));

  client.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } });

  return client;
};

export const createNotFoundSupabaseClient = () => {
  const client = createMockSupabaseClient();

  client.from = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((callback) =>
      Promise.resolve().then(() => callback({ data: [], error: null }))
    )
  }));

  return client;
};

// ============================================================================
// UNAUTHENTICATED MOCK
// ============================================================================

export const createUnauthenticatedSupabaseClient = () => {
  const client = createMockSupabaseClient();

  client.auth.getSession = vi.fn().mockResolvedValue({
    data: { session: null },
    error: null
  });

  client.auth.getUser = vi.fn().mockResolvedValue({
    data: { user: null },
    error: { name: 'AuthSessionMissingError', message: 'Auth session missing' }
  });

  return client;
};

// ============================================================================
// SESSION EXPIRED MOCK
// ============================================================================

export const createExpiredSessionSupabaseClient = () => {
  const client = createMockSupabaseClient();

  client.auth.getSession = vi.fn().mockResolvedValue({
    data: {
      session: {
        access_token: 'expired-token',
        expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        user: { id: 'test-user-id' }
      }
    },
    error: null
  });

  // Simulate refresh failure
  client.auth.refreshSession = vi.fn().mockResolvedValue({
    data: { session: null },
    error: { message: 'Refresh token expired' }
  });

  return client;
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export const mockSupabase = createMockSupabaseClient();
