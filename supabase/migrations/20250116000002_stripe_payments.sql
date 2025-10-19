-- ============================================================================
-- STRIPE PAYMENT PROCESSING SCHEMA
-- ============================================================================
-- Complete schema for Stripe Connect accounts and payment intents
-- Enables online dues payment via ACH and credit cards
-- ============================================================================

-- ============================================================================
-- 1. STRIPE CONNECTED ACCOUNTS TABLE
-- ============================================================================
-- Stores Stripe Connect account information for each chapter

CREATE TABLE IF NOT EXISTS stripe_connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL UNIQUE REFERENCES chapters(id) ON DELETE CASCADE,

  -- Stripe account information
  stripe_account_id TEXT NOT NULL UNIQUE,
  stripe_account_type TEXT NOT NULL CHECK (stripe_account_type IN ('express', 'standard')),

  -- Account capabilities
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,

  -- Onboarding status
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_url TEXT,
  onboarding_expires_at TIMESTAMPTZ,

  -- Bank account status
  has_bank_account BOOLEAN DEFAULT false,
  default_currency TEXT DEFAULT 'usd',

  -- Platform fee settings
  platform_fee_percentage NUMERIC(5,2) DEFAULT 2.9,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX stripe_connected_accounts_chapter_idx ON stripe_connected_accounts(chapter_id);
CREATE INDEX stripe_connected_accounts_stripe_id_idx ON stripe_connected_accounts(stripe_account_id);

COMMENT ON TABLE stripe_connected_accounts IS 'Stores Stripe Connect account information for chapter payment processing';

-- ============================================================================
-- 2. PAYMENT INTENTS TABLE
-- ============================================================================
-- Tracks Stripe payment intents for dues payments

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  member_dues_id UUID REFERENCES member_dues(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,

  -- Stripe payment intent details
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_client_secret TEXT,
  stripe_charge_id TEXT,

  -- Payment amounts (in cents, stored as dollars)
  amount NUMERIC(12,2) NOT NULL,
  platform_fee NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'usd',

  -- Payment method information
  payment_method_type TEXT CHECK (payment_method_type IN ('us_bank_account', 'card')),
  payment_method_brand TEXT,
  payment_method_last4 TEXT,

  -- Payment status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),

  -- Error handling
  failure_code TEXT,
  failure_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  processing_at TIMESTAMPTZ,
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX payment_intents_chapter_idx ON payment_intents(chapter_id);
CREATE INDEX payment_intents_member_dues_idx ON payment_intents(member_dues_id);
CREATE INDEX payment_intents_member_idx ON payment_intents(member_id);
CREATE INDEX payment_intents_stripe_id_idx ON payment_intents(stripe_payment_intent_id);
CREATE INDEX payment_intents_status_idx ON payment_intents(status);
CREATE INDEX payment_intents_created_idx ON payment_intents(created_at DESC);

COMMENT ON TABLE payment_intents IS 'Tracks Stripe payment intents for online dues payments';

-- ============================================================================
-- 3. UPDATE DUES_PAYMENTS TABLE (add Stripe columns)
-- ============================================================================

-- Add Stripe-related columns to existing dues_payments table
ALTER TABLE dues_payments
ADD COLUMN IF NOT EXISTS payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT,
ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id);

-- Indexes for Stripe columns
CREATE INDEX IF NOT EXISTS dues_payments_payment_intent_idx ON dues_payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS dues_payments_stripe_charge_idx ON dues_payments(stripe_charge_id);
CREATE INDEX IF NOT EXISTS dues_payments_reconciled_idx ON dues_payments(reconciled) WHERE reconciled = false;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- stripe_connected_accounts policies (chapter-scoped)
DROP POLICY IF EXISTS stripe_connected_accounts_policy ON stripe_connected_accounts;
CREATE POLICY stripe_connected_accounts_policy ON stripe_connected_accounts
  FOR ALL
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- payment_intents policies (chapter-scoped, members can see their own)
DROP POLICY IF EXISTS payment_intents_policy ON payment_intents;
CREATE POLICY payment_intents_policy ON payment_intents
  FOR ALL
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    member_id IN (
      SELECT id FROM members WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get Stripe account for a chapter
CREATE OR REPLACE FUNCTION get_stripe_account(p_chapter_id UUID)
RETURNS TABLE (
  id UUID,
  stripe_account_id TEXT,
  charges_enabled BOOLEAN,
  payouts_enabled BOOLEAN,
  onboarding_completed BOOLEAN,
  has_bank_account BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sca.id,
    sca.stripe_account_id,
    sca.charges_enabled,
    sca.payouts_enabled,
    sca.onboarding_completed,
    sca.has_bank_account
  FROM stripe_connected_accounts sca
  WHERE sca.chapter_id = p_chapter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment summary for a chapter
CREATE OR REPLACE FUNCTION get_payment_summary(p_chapter_id UUID, p_period_name TEXT DEFAULT NULL)
RETURNS TABLE (
  total_payments BIGINT,
  total_amount NUMERIC,
  stripe_ach_count BIGINT,
  stripe_ach_amount NUMERIC,
  stripe_card_count BIGINT,
  stripe_card_amount NUMERIC,
  manual_count BIGINT,
  manual_amount NUMERIC,
  last_payment_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_payments,
    COALESCE(SUM(dp.amount), 0) as total_amount,
    COUNT(*) FILTER (WHERE pi.payment_method_type = 'us_bank_account') as stripe_ach_count,
    COALESCE(SUM(dp.amount) FILTER (WHERE pi.payment_method_type = 'us_bank_account'), 0) as stripe_ach_amount,
    COUNT(*) FILTER (WHERE pi.payment_method_type = 'card') as stripe_card_count,
    COALESCE(SUM(dp.amount) FILTER (WHERE pi.payment_method_type = 'card'), 0) as stripe_card_amount,
    COUNT(*) FILTER (WHERE pi.id IS NULL) as manual_count,
    COALESCE(SUM(dp.amount) FILTER (WHERE pi.id IS NULL), 0) as manual_amount,
    MAX(dp.payment_date) as last_payment_date
  FROM dues_payments dp
  LEFT JOIN payment_intents pi ON dp.payment_intent_id = pi.id
  WHERE dp.chapter_id = p_chapter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for stripe_connected_accounts
CREATE OR REPLACE FUNCTION update_stripe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stripe_connected_accounts_updated_at ON stripe_connected_accounts;
CREATE TRIGGER stripe_connected_accounts_updated_at
  BEFORE UPDATE ON stripe_connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_updated_at();

DROP TRIGGER IF EXISTS payment_intents_updated_at ON payment_intents;
CREATE TRIGGER payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_updated_at();

-- ============================================================================
-- USAGE EXAMPLES & QUERIES
-- ============================================================================

-- Example 1: Get Stripe account status for a chapter
/*
SELECT * FROM get_stripe_account('your-chapter-uuid');
*/

-- Example 2: Get payment summary
/*
SELECT * FROM get_payment_summary('your-chapter-uuid');
*/

-- Example 3: View all successful payments
/*
SELECT
  pi.*,
  dp.amount as payment_amount,
  m.name as member_name
FROM payment_intents pi
JOIN dues_payments dp ON pi.id = dp.payment_intent_id
JOIN members m ON pi.member_id = m.id
WHERE pi.status = 'succeeded'
ORDER BY pi.succeeded_at DESC;
*/

-- Example 4: View pending payments
/*
SELECT
  pi.*,
  m.name as member_name,
  md.total_amount as dues_amount
FROM payment_intents pi
JOIN members m ON pi.member_id = m.id
JOIN member_dues md ON pi.member_dues_id = md.id
WHERE pi.status = 'pending'
ORDER BY pi.created_at DESC;
*/

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Stripe payment processing tables created successfully!' AS status;
