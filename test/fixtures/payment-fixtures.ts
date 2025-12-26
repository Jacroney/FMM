/**
 * Payment Fixtures
 *
 * Mock data for payment-related tests including:
 * - Member dues records
 * - Payment intents
 * - Dues configurations
 * - Dues payments
 * - Installment plans
 */

export const mockChapterId = 'chapter-test-123';
export const mockMemberId = 'member-test-456';
export const mockUserId = 'user-test-789';
export const mockConfigId = 'config-test-abc';

// ============================================================================
// DUES CONFIGURATIONS
// ============================================================================

export const mockDuesConfiguration = {
  id: mockConfigId,
  chapter_id: mockChapterId,
  period_name: 'Spring 2025',
  fiscal_year: '2025',
  dues_amount: 500,
  due_date: '2025-02-15',
  grace_period_days: 14,
  late_fee: 25,
  late_fee_type: 'fixed' as const,
  is_current: true,
  period_start_date: '2025-01-01',
  period_end_date: '2025-05-31',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
};

export const mockDuesConfigurations = [
  mockDuesConfiguration,
  {
    ...mockDuesConfiguration,
    id: 'config-test-def',
    period_name: 'Fall 2024',
    fiscal_year: '2024',
    is_current: false,
    period_start_date: '2024-08-01',
    period_end_date: '2024-12-31'
  }
];

// ============================================================================
// MEMBER DUES
// ============================================================================

export const mockMemberDues = {
  id: 'dues-test-001',
  chapter_id: mockChapterId,
  member_id: mockMemberId,
  config_id: mockConfigId,
  base_amount: 500,
  late_fee: 0,
  adjustments: 0,
  total_amount: 500,
  amount_paid: 0,
  balance: 500,
  due_date: '2025-02-15',
  assigned_date: '2025-01-15',
  paid_date: null,
  status: 'pending' as const,
  notes: null,
  created_at: '2025-01-15T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z'
};

export const mockMemberDuesPartial = {
  ...mockMemberDues,
  id: 'dues-test-002',
  amount_paid: 200,
  balance: 300,
  status: 'partial' as const
};

export const mockMemberDuesPaid = {
  ...mockMemberDues,
  id: 'dues-test-003',
  amount_paid: 500,
  balance: 0,
  paid_date: '2025-02-01',
  status: 'paid' as const
};

export const mockMemberDuesOverdue = {
  ...mockMemberDues,
  id: 'dues-test-004',
  late_fee: 25,
  total_amount: 525,
  balance: 525,
  status: 'overdue' as const
};

// ============================================================================
// MEMBER DUES SUMMARY (VIEW)
// ============================================================================

export const mockMemberDuesSummary = {
  id: mockMemberDues.id,
  chapter_id: mockChapterId,
  member_id: mockMemberId,
  config_id: mockConfigId,
  member_name: 'John Doe',
  member_email: 'john@example.com',
  member_status: 'active',
  member_year: 'Junior',
  period_name: 'Spring 2025',
  fiscal_year: '2025',
  base_amount: 500,
  late_fee: 0,
  adjustments: 0,
  total_amount: 500,
  amount_paid: 0,
  balance: 500,
  due_date: '2025-02-15',
  paid_date: null,
  status: 'pending',
  is_overdue: false,
  days_overdue: 0
};

// ============================================================================
// PAYMENT INTENTS
// ============================================================================

export const mockPaymentIntent = {
  id: 'pi-test-001',
  chapter_id: mockChapterId,
  member_id: mockMemberId,
  member_dues_id: mockMemberDues.id,
  stripe_payment_intent_id: 'pi_stripe_test_123',
  dues_amount: 500,
  stripe_fee: 15.24,
  platform_fee: 5,
  total_charge: 515.24,
  payment_method_type: 'card' as const,
  status: 'pending' as const,
  created_at: '2025-01-20T10:00:00Z',
  updated_at: '2025-01-20T10:00:00Z'
};

export const mockPaymentIntentACH = {
  ...mockPaymentIntent,
  id: 'pi-test-002',
  stripe_payment_intent_id: 'pi_stripe_test_456',
  stripe_fee: 0,
  total_charge: 500,
  payment_method_type: 'us_bank_account' as const
};

export const mockPaymentIntentSucceeded = {
  ...mockPaymentIntent,
  id: 'pi-test-003',
  stripe_payment_intent_id: 'pi_stripe_test_789',
  status: 'succeeded' as const,
  updated_at: '2025-01-20T10:05:00Z'
};

export const mockPaymentIntentProcessing = {
  ...mockPaymentIntent,
  id: 'pi-test-004',
  stripe_payment_intent_id: 'pi_stripe_test_processing',
  status: 'processing' as const
};

// ============================================================================
// DUES PAYMENTS
// ============================================================================

export const mockDuesPayment = {
  id: 'payment-test-001',
  chapter_id: mockChapterId,
  member_id: mockMemberId,
  member_dues_id: mockMemberDues.id,
  amount: 500,
  payment_method: 'stripe_card',
  payment_date: '2025-02-01',
  reference_number: 'pi_stripe_test_completed',
  notes: 'Online payment via card',
  recorded_by: mockUserId,
  created_at: '2025-02-01T10:00:00Z'
};

export const mockDuesPaymentACH = {
  ...mockDuesPayment,
  id: 'payment-test-002',
  payment_method: 'stripe_ach',
  reference_number: 'pi_stripe_test_ach_completed'
};

export const mockDuesPaymentCash = {
  ...mockDuesPayment,
  id: 'payment-test-003',
  payment_method: 'cash',
  reference_number: null,
  notes: 'Cash payment at meeting'
};

// ============================================================================
// INSTALLMENT PLANS
// ============================================================================

export const mockInstallmentEligibility = {
  id: 'elig-test-001',
  member_dues_id: mockMemberDues.id,
  chapter_id: mockChapterId,
  is_eligible: true,
  allowed_plans: [2, 3],
  enabled_by: mockUserId,
  enabled_at: '2025-01-15T00:00:00Z',
  notes: 'Approved for payment plan'
};

export const mockInstallmentPlan = {
  id: 'plan-test-001',
  chapter_id: mockChapterId,
  member_id: mockMemberId,
  member_dues_id: mockMemberDues.id,
  total_amount: 500,
  num_installments: 2,
  installment_amount: 250,
  stripe_payment_method_id: 'pm_test_123',
  status: 'active' as const,
  next_payment_date: '2025-02-15',
  created_at: '2025-01-15T00:00:00Z',
  cancelled_at: null
};

export const mockInstallmentPayments = [
  {
    id: 'inst-pay-001',
    installment_plan_id: mockInstallmentPlan.id,
    installment_number: 1,
    amount: 250,
    scheduled_date: '2025-01-15',
    status: 'paid' as const,
    paid_at: '2025-01-15T10:00:00Z',
    stripe_payment_intent_id: 'pi_inst_1'
  },
  {
    id: 'inst-pay-002',
    installment_plan_id: mockInstallmentPlan.id,
    installment_number: 2,
    amount: 250,
    scheduled_date: '2025-02-14',
    status: 'scheduled' as const,
    paid_at: null,
    stripe_payment_intent_id: null
  }
];

// ============================================================================
// STRIPE CONNECTED ACCOUNTS
// ============================================================================

export const mockStripeConnectedAccount = {
  id: 'stripe-acct-001',
  chapter_id: mockChapterId,
  stripe_account_id: 'acct_test_123',
  details_submitted: true,
  charges_enabled: true,
  payouts_enabled: true,
  onboarding_completed: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
};

export const mockStripeConnectedAccountPending = {
  ...mockStripeConnectedAccount,
  id: 'stripe-acct-002',
  details_submitted: false,
  charges_enabled: false,
  payouts_enabled: false,
  onboarding_completed: false
};

// ============================================================================
// SAVED PAYMENT METHODS
// ============================================================================

export const mockSavedPaymentMethod = {
  id: 'saved-pm-001',
  user_id: mockUserId,
  stripe_payment_method_id: 'pm_test_saved_123',
  type: 'card',
  card_brand: 'visa',
  card_last4: '4242',
  card_exp_month: 12,
  card_exp_year: 2028,
  is_default: true,
  created_at: '2025-01-01T00:00:00Z'
};

export const mockSavedPaymentMethodBank = {
  id: 'saved-pm-002',
  user_id: mockUserId,
  stripe_payment_method_id: 'pm_test_saved_bank',
  type: 'us_bank_account',
  bank_name: 'Chase',
  bank_last4: '6789',
  is_default: false,
  created_at: '2025-01-02T00:00:00Z'
};

// ============================================================================
// USER PROFILES
// ============================================================================

export const mockUserProfile = {
  id: mockUserId,
  chapter_id: mockChapterId,
  email: 'john@example.com',
  full_name: 'John Doe',
  phone_number: '555-123-4567',
  year: 'Junior' as const,
  major: 'Computer Science',
  position: 'Member',
  role: 'member' as const,
  dues_balance: 500,
  status: 'active' as const,
  is_active: true,
  installment_eligible: false,
  created_at: '2024-09-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z'
};

export const mockAdminProfile = {
  ...mockUserProfile,
  id: 'admin-test-001',
  email: 'admin@example.com',
  full_name: 'Admin User',
  position: 'President',
  role: 'admin' as const,
  dues_balance: 0
};

export const mockExecProfile = {
  ...mockUserProfile,
  id: 'exec-test-001',
  email: 'treasurer@example.com',
  full_name: 'Treasurer User',
  position: 'Treasurer',
  role: 'exec' as const,
  dues_balance: 0
};

// ============================================================================
// CHAPTER DUES STATS
// ============================================================================

export const mockChapterDuesStats = {
  chapter_id: mockChapterId,
  period_name: 'Spring 2025',
  fiscal_year: '2025',
  total_members: 50,
  members_paid: 35,
  members_pending: 10,
  members_overdue: 5,
  payment_rate: 70,
  total_expected: 25000,
  total_collected: 17500,
  total_outstanding: 7500,
  total_late_fees: 125
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const createMemberDues = (overrides: Partial<typeof mockMemberDues> = {}) => ({
  ...mockMemberDues,
  id: `dues-${Date.now()}`,
  ...overrides
});

export const createPaymentIntent = (overrides: Partial<typeof mockPaymentIntent> = {}) => ({
  ...mockPaymentIntent,
  id: `pi-${Date.now()}`,
  stripe_payment_intent_id: `pi_stripe_${Date.now()}`,
  ...overrides
});

export const createDuesPayment = (overrides: Partial<typeof mockDuesPayment> = {}) => ({
  ...mockDuesPayment,
  id: `payment-${Date.now()}`,
  ...overrides
});

export const createUserProfile = (overrides: Partial<typeof mockUserProfile> = {}) => ({
  ...mockUserProfile,
  id: `user-${Date.now()}`,
  ...overrides
});
