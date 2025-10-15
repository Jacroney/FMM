-- =====================================================
-- STRIPE PAYMENT PROCESSING MIGRATION
-- =====================================================
-- This migration adds tables and functions for online dues collection
-- via Stripe Connect (ACH and card payments)
--
-- Tables:
--   - stripe_connected_accounts: Chapter Stripe accounts
--   - payment_intents: Stripe payment sessions
--   - dues_payments: Completed payment records
--
-- Author: Greek Pay Team
-- Date: 2025-01-15
-- =====================================================

-- =====================================================
-- TABLE: stripe_connected_accounts
-- =====================================================
-- Stores Stripe Connected Account information for each chapter
-- Chapters connect their own Stripe account to receive payments

CREATE TABLE IF NOT EXISTS stripe_connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID UNIQUE NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  -- Stripe account information
  stripe_account_id TEXT UNIQUE NOT NULL,
  stripe_account_type TEXT NOT NULL DEFAULT 'express', -- 'standard' or 'express'

  -- Account capabilities
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,

  -- Onboarding status
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_url TEXT,
  onboarding_expires_at TIMESTAMPTZ,

  -- Bank account status
  has_bank_account BOOLEAN DEFAULT FALSE,
  default_currency TEXT DEFAULT 'usd',

  -- Platform fee settings (optional revenue model)
  platform_fee_percentage NUMERIC(5,2) DEFAULT 0.00 CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 10),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast chapter lookups
CREATE INDEX idx_stripe_accounts_chapter ON stripe_connected_accounts(chapter_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_stripe_accounts_updated_at
  BEFORE UPDATE ON stripe_connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE stripe_connected_accounts IS 'Stripe Connected Account info for chapters to receive payments';
COMMENT ON COLUMN stripe_connected_accounts.stripe_account_id IS 'Stripe account ID (acct_xxx)';
COMMENT ON COLUMN stripe_connected_accounts.onboarding_url IS 'Stripe onboarding URL for incomplete accounts';
COMMENT ON COLUMN stripe_connected_accounts.platform_fee_percentage IS 'Optional platform fee (0-10%)';

-- =====================================================
-- TABLE: payment_intents
-- =====================================================
-- Tracks Stripe Payment Intent sessions
-- One payment intent per payment attempt

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  member_dues_id UUID NOT NULL REFERENCES member_dues(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Stripe payment intent details
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_client_secret TEXT, -- For frontend Stripe Elements
  stripe_charge_id TEXT, -- Charge ID when successful

  -- Payment amounts (in dollars)
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  platform_fee NUMERIC(12,2) DEFAULT 0.00 CHECK (platform_fee >= 0),
  net_amount NUMERIC(12,2) NOT NULL CHECK (net_amount >= 0), -- What chapter receives
  currency TEXT DEFAULT 'usd',

  -- Payment method information
  payment_method_type TEXT, -- 'us_bank_account' or 'card'
  payment_method_brand TEXT, -- 'visa', 'mastercard', 'bank', etc.
  payment_method_last4 TEXT,

  -- Payment status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),

  -- Error handling
  failure_code TEXT,
  failure_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processing_at TIMESTAMPTZ,
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_payment_intents_chapter ON payment_intents(chapter_id);
CREATE INDEX idx_payment_intents_member ON payment_intents(member_id);
CREATE INDEX idx_payment_intents_member_dues ON payment_intents(member_dues_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
CREATE INDEX idx_payment_intents_created ON payment_intents(created_at DESC);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE payment_intents IS 'Stripe Payment Intent sessions for tracking payment attempts';
COMMENT ON COLUMN payment_intents.stripe_client_secret IS 'Client secret for Stripe Elements (sensitive)';
COMMENT ON COLUMN payment_intents.net_amount IS 'Amount chapter receives after platform fee';
COMMENT ON COLUMN payment_intents.status IS 'Payment status: pending, processing, succeeded, failed, canceled';

-- =====================================================
-- TABLE: dues_payments
-- =====================================================
-- Records of completed dues payments
-- One record per successful payment

CREATE TABLE IF NOT EXISTS dues_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  member_dues_id UUID NOT NULL REFERENCES member_dues(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,

  -- Payment details
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL, -- 'stripe_ach', 'stripe_card', 'cash', 'check', 'venmo', 'zelle', 'other'
  payment_date TIMESTAMPTZ DEFAULT NOW(),

  -- Stripe references (for online payments)
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT, -- Transfer to connected account
  stripe_payout_id TEXT, -- Payout to bank account

  -- Reconciliation tracking
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES auth.users(id),

  -- Additional metadata
  reference_number TEXT, -- Check number, transaction ID, etc.
  notes TEXT,

  -- Audit trail
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups and reporting
CREATE INDEX idx_dues_payments_chapter ON dues_payments(chapter_id);
CREATE INDEX idx_dues_payments_member ON dues_payments(member_id);
CREATE INDEX idx_dues_payments_member_dues ON dues_payments(member_dues_id);
CREATE INDEX idx_dues_payments_date ON dues_payments(payment_date DESC);
CREATE INDEX idx_dues_payments_method ON dues_payments(payment_method);
CREATE INDEX idx_dues_payments_reconciled ON dues_payments(reconciled) WHERE reconciled = FALSE;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_dues_payments_updated_at
  BEFORE UPDATE ON dues_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE dues_payments IS 'Completed dues payment records (online and manual)';
COMMENT ON COLUMN dues_payments.payment_method IS 'Payment method: stripe_ach, stripe_card, cash, check, venmo, zelle, other';
COMMENT ON COLUMN dues_payments.reconciled IS 'Whether payment has been reconciled with bank statement';
COMMENT ON COLUMN dues_payments.reference_number IS 'Check number, Stripe charge ID, or other reference';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues_payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS: stripe_connected_accounts
-- =====================================================

-- Admins and execs can view their chapter's Stripe account
CREATE POLICY stripe_accounts_select_policy ON stripe_connected_accounts
  FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'exec')
    )
  );

-- Only admins can manage Stripe accounts
CREATE POLICY stripe_accounts_manage_policy ON stripe_connected_accounts
  FOR ALL
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- RLS: payment_intents
-- =====================================================

-- Members can view their own payment intents
CREATE POLICY payment_intents_member_select ON payment_intents
  FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM members
      WHERE chapter_id IN (
        SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
      )
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admins and execs can view all payment intents for their chapter
CREATE POLICY payment_intents_admin_select ON payment_intents
  FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'exec')
    )
  );

-- Members can create payment intents for their own dues
CREATE POLICY payment_intents_member_insert ON payment_intents
  FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM members
      WHERE chapter_id IN (
        SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
      )
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Only system (service role) can update payment intents (via webhooks)
-- Members and admins can only view, not update directly

-- =====================================================
-- RLS: dues_payments
-- =====================================================

-- Members can view their own payments
CREATE POLICY dues_payments_member_select ON dues_payments
  FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM members
      WHERE chapter_id IN (
        SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
      )
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admins and execs can view all payments for their chapter
CREATE POLICY dues_payments_admin_select ON dues_payments
  FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'exec')
    )
  );

-- Admins and execs can insert payments (manual recording)
CREATE POLICY dues_payments_admin_insert ON dues_payments
  FOR INSERT
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'exec')
    )
  );

-- Admins can update payment records (for reconciliation)
CREATE POLICY dues_payments_admin_update ON dues_payments
  FOR UPDATE
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to record a payment and update member_dues
CREATE OR REPLACE FUNCTION record_dues_payment(
  p_member_dues_id UUID,
  p_payment_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'stripe_ach',
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_stripe_charge_id TEXT DEFAULT NULL,
  p_payment_intent_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_dues RECORD;
  v_new_amount_paid NUMERIC;
  v_new_balance NUMERIC;
  v_new_status TEXT;
  v_payment_id UUID;
BEGIN
  -- Get current member dues record
  SELECT * INTO v_member_dues
  FROM member_dues
  WHERE id = p_member_dues_id;

  IF v_member_dues IS NULL THEN
    RAISE EXCEPTION 'Member dues record not found';
  END IF;

  -- Calculate new amounts
  v_new_amount_paid := v_member_dues.amount_paid + p_payment_amount;
  v_new_balance := v_member_dues.total_amount - v_new_amount_paid;

  -- Determine new status
  IF v_new_balance <= 0 THEN
    v_new_status := 'paid';
  ELSIF v_new_amount_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := v_member_dues.status;
  END IF;

  -- Insert payment record
  INSERT INTO dues_payments (
    chapter_id,
    member_dues_id,
    member_id,
    payment_intent_id,
    amount,
    payment_method,
    reference_number,
    notes,
    stripe_charge_id,
    created_by
  ) VALUES (
    v_member_dues.chapter_id,
    p_member_dues_id,
    v_member_dues.member_id,
    p_payment_intent_id,
    p_payment_amount,
    p_payment_method,
    p_reference_number,
    p_notes,
    p_stripe_charge_id,
    auth.uid()
  )
  RETURNING id INTO v_payment_id;

  -- Update member_dues record
  UPDATE member_dues
  SET
    amount_paid = v_new_amount_paid,
    balance = v_new_balance,
    status = v_new_status,
    last_payment_date = NOW(),
    updated_at = NOW()
  WHERE id = p_member_dues_id;

  -- Return success with updated info
  RETURN jsonb_build_object(
    'success', TRUE,
    'payment_id', v_payment_id,
    'new_amount_paid', v_new_amount_paid,
    'new_balance', v_new_balance,
    'new_status', v_new_status
  );
END;
$$;

COMMENT ON FUNCTION record_dues_payment IS 'Records a payment and updates member_dues balance and status';

-- Function to get payment summary for a chapter
CREATE OR REPLACE FUNCTION get_chapter_payment_summary(
  p_chapter_id UUID,
  p_period_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_payments INTEGER,
  total_amount NUMERIC,
  stripe_ach_count INTEGER,
  stripe_ach_amount NUMERIC,
  stripe_card_count INTEGER,
  stripe_card_amount NUMERIC,
  manual_count INTEGER,
  manual_amount NUMERIC,
  last_payment_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_payments,
    COALESCE(SUM(dp.amount), 0) AS total_amount,
    COUNT(*) FILTER (WHERE dp.payment_method = 'stripe_ach')::INTEGER AS stripe_ach_count,
    COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_method = 'stripe_ach'), 0) AS stripe_ach_amount,
    COUNT(*) FILTER (WHERE dp.payment_method = 'stripe_card')::INTEGER AS stripe_card_count,
    COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_method = 'stripe_card'), 0) AS stripe_card_amount,
    COUNT(*) FILTER (WHERE dp.payment_method NOT IN ('stripe_ach', 'stripe_card'))::INTEGER AS manual_count,
    COALESCE(SUM(dp.amount) FILTER (WHERE dp.payment_method NOT IN ('stripe_ach', 'stripe_card')), 0) AS manual_amount,
    MAX(dp.payment_date) AS last_payment_date
  FROM dues_payments dp
  LEFT JOIN member_dues md ON dp.member_dues_id = md.id
  LEFT JOIN dues_configurations dc ON md.configuration_id = dc.id
  WHERE dp.chapter_id = p_chapter_id
    AND (p_period_name IS NULL OR dc.period_name = p_period_name);
END;
$$;

COMMENT ON FUNCTION get_chapter_payment_summary IS 'Get payment summary statistics for a chapter';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on new tables
GRANT SELECT, INSERT, UPDATE ON stripe_connected_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_intents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON dues_payments TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION record_dues_payment TO authenticated;
GRANT EXECUTE ON FUNCTION get_chapter_payment_summary TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON SCHEMA public IS 'Payment processing tables added - Migration 20250115000001';
