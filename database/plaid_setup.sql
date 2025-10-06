-- ============================================================================
-- PLAID INTEGRATION DATABASE SCHEMA
-- ============================================================================
-- Creates tables and policies for Plaid bank account connections and syncing
-- ============================================================================

-- ============================================================================
-- 1. PLAID CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS plaid_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  institution_name TEXT,
  institution_id TEXT,
  access_token TEXT NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  cursor TEXT, -- For incremental transaction sync
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  error_code TEXT,
  error_message TEXT,
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
-- 2. PLAID SYNC HISTORY (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plaid_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES plaid_connections(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL,
  transactions_added INTEGER DEFAULT 0,
  transactions_modified INTEGER DEFAULT 0,
  transactions_removed INTEGER DEFAULT 0,
  cursor_before TEXT,
  cursor_after TEXT,
  sync_status TEXT DEFAULT 'running' CHECK (sync_status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS plaid_sync_history_connection_idx ON plaid_sync_history(connection_id);
CREATE INDEX IF NOT EXISTS plaid_sync_history_chapter_idx ON plaid_sync_history(chapter_id);
CREATE INDEX IF NOT EXISTS plaid_sync_history_started_idx ON plaid_sync_history(started_at DESC);

COMMENT ON TABLE plaid_sync_history IS 'Audit log of all Plaid transaction sync operations';

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE plaid_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_sync_history ENABLE ROW LEVEL SECURITY;

-- plaid_connections policies (chapter-scoped)
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

-- plaid_sync_history policies (read-only for users)
CREATE POLICY plaid_sync_history_chapter_isolation ON plaid_sync_history
  FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to mark a connection as inactive
CREATE OR REPLACE FUNCTION deactivate_plaid_connection(p_connection_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE plaid_connections
  SET is_active = false, updated_at = now()
  WHERE id = p_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active connections for a chapter
CREATE OR REPLACE FUNCTION get_active_plaid_connections(p_chapter_id UUID)
RETURNS TABLE (
  id UUID,
  institution_name TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.institution_name,
    pc.last_synced_at,
    pc.created_at
  FROM plaid_connections pc
  WHERE pc.chapter_id = p_chapter_id
    AND pc.is_active = true
  ORDER BY pc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_plaid_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plaid_connections_updated_at
  BEFORE UPDATE ON plaid_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_plaid_connections_updated_at();

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Get active connections for chapter
/*
SELECT * FROM get_active_plaid_connections('your-chapter-uuid');
*/

-- Example 2: View sync history
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

-- Example 3: Deactivate a connection
/*
SELECT deactivate_plaid_connection('connection-uuid');
*/
