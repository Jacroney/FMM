/**
 * Stripe API Mock
 *
 * Mock implementations for Stripe API calls used in payment processing.
 * This mock is used to test service interactions with Stripe.
 */

import { vi } from 'vitest';

// ============================================================================
// PAYMENT INTENT RESPONSES
// ============================================================================

export const mockPaymentIntentCreate = {
  id: 'pi_test_mock_123',
  object: 'payment_intent',
  amount: 10320, // $103.20 in cents
  amount_received: 0,
  client_secret: 'pi_test_mock_123_secret_abc',
  currency: 'usd',
  status: 'requires_payment_method',
  payment_method_types: ['card'],
  metadata: {
    member_dues_id: 'dues-test-001',
    chapter_id: 'chapter-test-123'
  },
  created: Math.floor(Date.now() / 1000)
};

export const mockPaymentIntentSucceeded = {
  ...mockPaymentIntentCreate,
  status: 'succeeded',
  amount_received: 10320
};

export const mockPaymentIntentProcessing = {
  ...mockPaymentIntentCreate,
  status: 'processing'
};

export const mockPaymentIntentCanceled = {
  ...mockPaymentIntentCreate,
  status: 'canceled',
  canceled_at: Math.floor(Date.now() / 1000)
};

// ============================================================================
// PAYMENT METHOD RESPONSES
// ============================================================================

export const mockPaymentMethodCard = {
  id: 'pm_test_card_123',
  object: 'payment_method',
  type: 'card',
  card: {
    brand: 'visa',
    last4: '4242',
    exp_month: 12,
    exp_year: 2028,
    funding: 'credit'
  },
  billing_details: {
    email: 'test@example.com',
    name: 'Test User'
  },
  created: Math.floor(Date.now() / 1000)
};

export const mockPaymentMethodBank = {
  id: 'pm_test_bank_456',
  object: 'payment_method',
  type: 'us_bank_account',
  us_bank_account: {
    bank_name: 'Chase',
    last4: '6789',
    routing_number: '110000000',
    account_type: 'checking'
  },
  billing_details: {
    email: 'test@example.com',
    name: 'Test User'
  },
  created: Math.floor(Date.now() / 1000)
};

// ============================================================================
// STRIPE CONNECT RESPONSES
// ============================================================================

export const mockStripeAccount = {
  id: 'acct_test_123',
  object: 'account',
  type: 'express',
  email: 'chapter@example.com',
  details_submitted: true,
  charges_enabled: true,
  payouts_enabled: true,
  capabilities: {
    card_payments: 'active',
    transfers: 'active',
    us_bank_account_ach_payments: 'active'
  }
};

export const mockStripeAccountLink = {
  object: 'account_link',
  url: 'https://connect.stripe.com/setup/test_link',
  expires_at: Math.floor(Date.now() / 1000) + 3600
};

// ============================================================================
// WEBHOOK EVENT RESPONSES
// ============================================================================

export const mockWebhookEventPaymentSucceeded = {
  id: 'evt_test_123',
  object: 'event',
  type: 'payment_intent.succeeded',
  data: {
    object: mockPaymentIntentSucceeded
  },
  created: Math.floor(Date.now() / 1000),
  livemode: false
};

export const mockWebhookEventPaymentFailed = {
  id: 'evt_test_failed_123',
  object: 'event',
  type: 'payment_intent.payment_failed',
  data: {
    object: {
      ...mockPaymentIntentCreate,
      status: 'requires_payment_method',
      last_payment_error: {
        code: 'card_declined',
        message: 'Your card was declined.'
      }
    }
  },
  created: Math.floor(Date.now() / 1000),
  livemode: false
};

// ============================================================================
// STRIPE CLIENT MOCK
// ============================================================================

export const createMockStripe = () => ({
  paymentIntents: {
    create: vi.fn().mockResolvedValue(mockPaymentIntentCreate),
    retrieve: vi.fn().mockResolvedValue(mockPaymentIntentCreate),
    cancel: vi.fn().mockResolvedValue(mockPaymentIntentCanceled),
    update: vi.fn().mockResolvedValue(mockPaymentIntentCreate),
    confirm: vi.fn().mockResolvedValue(mockPaymentIntentSucceeded)
  },
  paymentMethods: {
    retrieve: vi.fn().mockResolvedValue(mockPaymentMethodCard),
    attach: vi.fn().mockResolvedValue(mockPaymentMethodCard),
    detach: vi.fn().mockResolvedValue({ id: 'pm_test_card_123', deleted: true })
  },
  customers: {
    create: vi.fn().mockResolvedValue({
      id: 'cus_test_123',
      email: 'test@example.com'
    }),
    retrieve: vi.fn().mockResolvedValue({
      id: 'cus_test_123',
      email: 'test@example.com'
    })
  },
  accounts: {
    create: vi.fn().mockResolvedValue(mockStripeAccount),
    retrieve: vi.fn().mockResolvedValue(mockStripeAccount),
    update: vi.fn().mockResolvedValue(mockStripeAccount)
  },
  accountLinks: {
    create: vi.fn().mockResolvedValue(mockStripeAccountLink)
  },
  webhooks: {
    constructEvent: vi.fn().mockImplementation((payload, sig, secret) => {
      // Return a mock event based on the payload
      return mockWebhookEventPaymentSucceeded;
    })
  }
});

// ============================================================================
// EDGE FUNCTION RESPONSE MOCKS
// ============================================================================

export const mockCreatePaymentIntentResponse = {
  success: true,
  client_secret: 'pi_test_mock_123_secret_abc',
  payment_intent_id: 'pi-internal-001',
  stripe_payment_intent_id: 'pi_test_mock_123',
  dues_amount: 100,
  stripe_fee: 3.20,
  platform_fee: 1.00,
  total_charge: 103.20,
  chapter_receives: 99.00
};

export const mockStripeConnectResponse = {
  success: true,
  account_id: 'acct_test_123',
  onboarding_url: 'https://connect.stripe.com/setup/test_link',
  onboarding_completed: false
};

export const mockStripeConnectStatusResponse = {
  success: true,
  account_id: 'acct_test_123',
  onboarding_completed: true,
  charges_enabled: true,
  payouts_enabled: true
};

// ============================================================================
// FETCH MOCK FOR EDGE FUNCTIONS
// ============================================================================

export const createPaymentFetchMock = () => {
  return vi.fn((url: string, options?: RequestInit) => {
    // Create payment intent
    if (url.includes('/functions/v1/create-payment-intent')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockCreatePaymentIntentResponse
      });
    }

    // Stripe Connect
    if (url.includes('/functions/v1/stripe-connect')) {
      const body = options?.body ? JSON.parse(options.body as string) : {};

      if (body.action === 'check_status') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockStripeConnectStatusResponse
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStripeConnectResponse
      });
    }

    // Create installment plan
    if (url.includes('/functions/v1/create-installment-plan')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          plan_id: 'plan-test-001',
          installments: [
            { installment_number: 1, amount: 250, scheduled_date: '2025-01-15' },
            { installment_number: 2, amount: 250, scheduled_date: '2025-02-14' }
          ]
        })
      });
    }

    // Default: 404
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' })
    });
  });
};

// ============================================================================
// WEBHOOK SIGNATURE HELPERS
// ============================================================================

export const createMockWebhookSignature = (
  payload: string,
  secret: string,
  timestamp?: number
): string => {
  // In real tests, this would compute an actual HMAC
  // For unit tests, we return a format that matches Stripe's signature
  const ts = timestamp || Math.floor(Date.now() / 1000);
  return `t=${ts},v1=mock_signature_${Buffer.from(payload).toString('base64').slice(0, 20)}`;
};

export const mockWebhookSecret = 'whsec_test_secret_123';
