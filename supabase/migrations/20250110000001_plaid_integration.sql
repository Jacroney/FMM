-- ============================================================================
-- PLAID INTEGRATION DATABASE SCHEMA
-- ============================================================================
-- Complete schema for Plaid bank account connections, accounts, and syncing
-- ============================================================================

-- ============================================================================
-- 1. PLAID CONNECTIONS TABLE
-- ============================================================================
-- Stores bank institution connections with access tokens

CREATE TABLE IF NOT EXISTS plaid_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  -- Institution details
  institution_name TEXT,
  institution_id TEXT,

  -- Plaid tokens
  access_token TEXT NOT NULL,
  item_id TEXT NOT NULL UNIQUE,

  -- Sync tracking
  cursor TEXT, -- For incremental transaction sync
  last_synced_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  error_code TEXT,
  error_message TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS plaid_connections_chapter_idx ON plaid_connections(chapter_id);
CREATE INDEX IF NOT EXISTS plaid_connections_item_idx ON plaid_connections(item_id);
CREATE INDEX IF NOT EXISTS plaid_connections_active_idx ON plaid_connections(is_active) WHERE is_active = true;

COMMENT ON TABLE plaid_connections IS 'Stores Plaid bank account connections for chapters';

-- ============================================================================
-- 2. PLAID ACCOUNTS TABLE
-- ============================================================================
-- Stores individual bank accounts from Plaid connections

CREATE TABLE IF NOT EXISTS plaid_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES plaid_connections(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  -- Plaid account details
  account_id TEXT NOT NULL, -- Plaid's account ID
  account_name TEXT,
  official_name TEXT,
  account_type TEXT, -- depository, credit, loan, investment
  account_subtype TEXT, -- checking, savings, credit card, etc.

  -- Mask and verification
  mask TEXT, -- Last 4 digits
  verification_status TEXT,

  -- Balance information
  current_balance DECIMAL(12, 2),
  available_balance DECIMAL(12, 2),
  iso_currency_code TEXT DEFAULT 'USD',

  -- Tracking
  last_balance_update TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure account_id is unique per connection
  UNIQUE(connection_id, account_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS plaid_accounts_connection_idx ON plaid_accounts(connection_id);
CREATE INDEX IF NOT EXISTS plaid_accounts_chapter_idx ON plaid_accounts(chapter_id);
CREATE INDEX IF NOT EXISTS plaid_accounts_account_id_idx ON plaid_accounts(account_id);
CREATE INDEX IF NOT EXISTS plaid_accounts_active_idx ON plaid_accounts(is_active) WHERE is_active = true;

COMMENT ON TABLE plaid_accounts IS 'Stores individual bank accounts from Plaid connections';

-- ============================================================================
-- 3. PLAID SYNC HISTORY (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plaid_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES plaid_connections(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  -- Sync statistics
  transactions_added INTEGER DEFAULT 0,
  transactions_modified INTEGER DEFAULT 0,
  transactions_removed INTEGER DEFAULT 0,
  accounts_updated INTEGER DEFAULT 0,

  -- Cursor tracking
  cursor_before TEXT,
  cursor_after TEXT,

  -- Status
  sync_status TEXT DEFAULT 'running' CHECK (sync_status IN ('running', 'completed', 'failed')),
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS plaid_sync_history_connection_idx ON plaid_sync_history(connection_id);
CREATE INDEX IF NOT EXISTS plaid_sync_history_chapter_idx ON plaid_sync_history(chapter_id);
CREATE INDEX IF NOT EXISTS plaid_sync_history_started_idx ON plaid_sync_history(started_at DESC);

COMMENT ON TABLE plaid_sync_history IS 'Audit log of all Plaid transaction sync operations';

-- ============================================================================
-- 4. UPDATE EXPENSES TABLE FOR PLAID
-- ============================================================================
-- Add plaid-specific columns to expenses table

DO $$
BEGIN
  -- Add plaid_transaction_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'plaid_transaction_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN plaid_transaction_id TEXT;
    CREATE UNIQUE INDEX expenses_plaid_transaction_id_idx ON expenses(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;
  END IF;

  -- Add account_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN account_id UUID REFERENCES plaid_accounts(id) ON DELETE SET NULL;
    CREATE INDEX expenses_account_id_idx ON expenses(account_id);
  END IF;

  -- Update source column to allow 'PLAID' if not already present
  -- Note: This assumes source is a text column. Adjust if it's an enum type.
END $$;

COMMENT ON COLUMN expenses.plaid_transaction_id IS 'Plaid transaction ID for deduplication';
COMMENT ON COLUMN expenses.account_id IS 'Reference to plaid_accounts if transaction came from Plaid';

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE plaid_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_sync_history ENABLE ROW LEVEL SECURITY;

-- plaid_connections policies (chapter-scoped)
DROP POLICY IF EXISTS plaid_connections_chapter_isolation ON plaid_connections;
CREATE POLICY plaid_connections_chapter_isolation ON plaid_connections
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

-- plaid_accounts policies (chapter-scoped)
DROP POLICY IF EXISTS plaid_accounts_chapter_isolation ON plaid_accounts;
CREATE POLICY plaid_accounts_chapter_isolation ON plaid_accounts
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

-- plaid_sync_history policies (read-only for users)
DROP POLICY IF EXISTS plaid_sync_history_chapter_isolation ON plaid_sync_history;
CREATE POLICY plaid_sync_history_chapter_isolation ON plaid_sync_history
  FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get total balance across all connected accounts
CREATE OR REPLACE FUNCTION get_total_bank_balance(p_chapter_id UUID)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  total DECIMAL(12, 2);
BEGIN
  SELECT COALESCE(SUM(current_balance), 0)
  INTO total
  FROM plaid_accounts
  WHERE chapter_id = p_chapter_id
    AND is_active = true;

  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark a connection as inactive
CREATE OR REPLACE FUNCTION deactivate_plaid_connection(p_connection_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE plaid_connections
  SET is_active = false, updated_at = now()
  WHERE id = p_connection_id;

  -- Also mark all accounts as inactive
  UPDATE plaid_accounts
  SET is_active = false, updated_at = now()
  WHERE connection_id = p_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active connections for a chapter
CREATE OR REPLACE FUNCTION get_active_plaid_connections(p_chapter_id UUID)
RETURNS TABLE (
  id UUID,
  institution_name TEXT,
  last_synced_at TIMESTAMPTZ,
  account_count BIGINT,
  total_balance DECIMAL(12, 2),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.institution_name,
    pc.last_synced_at,
    COUNT(pa.id) as account_count,
    COALESCE(SUM(pa.current_balance), 0) as total_balance,
    pc.created_at
  FROM plaid_connections pc
  LEFT JOIN plaid_accounts pa ON pa.connection_id = pc.id AND pa.is_active = true
  WHERE pc.chapter_id = p_chapter_id
    AND pc.is_active = true
  GROUP BY pc.id
  ORDER BY pc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get accounts for a connection
CREATE OR REPLACE FUNCTION get_plaid_accounts_for_connection(p_connection_id UUID)
RETURNS TABLE (
  id UUID,
  account_name TEXT,
  account_type TEXT,
  account_subtype TEXT,
  mask TEXT,
  current_balance DECIMAL(12, 2),
  available_balance DECIMAL(12, 2),
  last_balance_update TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.id,
    pa.account_name,
    pa.account_type,
    pa.account_subtype,
    pa.mask,
    pa.current_balance,
    pa.available_balance,
    pa.last_balance_update
  FROM plaid_accounts pa
  WHERE pa.connection_id = p_connection_id
    AND pa.is_active = true
  ORDER BY pa.account_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for plaid_connections
CREATE OR REPLACE FUNCTION update_plaid_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plaid_connections_updated_at_trigger ON plaid_connections;
CREATE TRIGGER plaid_connections_updated_at_trigger
  BEFORE UPDATE ON plaid_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_plaid_connections_updated_at();

-- Auto-update updated_at timestamp for plaid_accounts
CREATE OR REPLACE FUNCTION update_plaid_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plaid_accounts_updated_at_trigger ON plaid_accounts;
CREATE TRIGGER plaid_accounts_updated_at_trigger
  BEFORE UPDATE ON plaid_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_plaid_accounts_updated_at();

-- ============================================================================
-- USAGE EXAMPLES & QUERIES
-- ============================================================================

-- Example 1: Get total bank balance for a chapter
/*
SELECT get_total_bank_balance('your-chapter-uuid');
*/

-- Example 2: Get all active connections with account counts
/*
SELECT * FROM get_active_plaid_connections('your-chapter-uuid');
*/

-- Example 3: View sync history
/*
SELECT
  psh.*,
  pc.institution_name
FROM plaid_sync_history psh
JOIN plaid_connections pc ON pc.id = psh.connection_id
WHERE psh.chapter_id = 'your-chapter-uuid'
ORDER BY psh.started_at DESC
LIMIT 20;
*/

-- Example 4: Get all accounts for a connection
/*
SELECT * FROM get_plaid_accounts_for_connection('connection-uuid');
*/

-- Example 5: Deactivate a connection and all its accounts
/*
SELECT deactivate_plaid_connection('connection-uuid');
*/

-- Example 6: Get Plaid transactions (expenses) for an account
/*
SELECT
  e.*
FROM expenses e
WHERE e.account_id = 'account-uuid'
  AND e.source = 'PLAID'
ORDER BY e.transaction_date DESC;
*/
