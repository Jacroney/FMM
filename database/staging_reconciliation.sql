-- ============================================================================
-- STAGING TABLES & RECONCILIATION SYSTEM
-- ============================================================================
-- Creates staging tables for transaction ingestion from multiple sources
-- (transaction_staging, plaid_txn_staging, switch_txn_staging) with
-- idempotency controls, reconciliation logic, and audit tracking.
-- ============================================================================

-- ============================================================================
-- 1. STAGING TABLES
-- ============================================================================

-- Generic transaction staging table
CREATE TABLE IF NOT EXISTS transaction_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  date DATE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  raw_data JSONB,
  hash TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'processed', 'error')),
  ingested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Plaid-specific transaction staging
CREATE TABLE IF NOT EXISTS plaid_txn_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  date DATE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  raw_data JSONB,
  hash TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'processed', 'error')),
  ingested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Switch-specific transaction staging
CREATE TABLE IF NOT EXISTS switch_txn_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  date DATE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  raw_data JSONB,
  hash TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'processed', 'error')),
  ingested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- ============================================================================
-- 2. IDEMPOTENCY & PERFORMANCE INDEXES
-- ============================================================================

-- transaction_staging indexes
CREATE UNIQUE INDEX IF NOT EXISTS transaction_staging_idempotency_idx
  ON transaction_staging(source, external_id, chapter_id);
CREATE INDEX IF NOT EXISTS transaction_staging_hash_idx
  ON transaction_staging(hash) WHERE hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS transaction_staging_status_idx
  ON transaction_staging(status) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS transaction_staging_chapter_idx
  ON transaction_staging(chapter_id);

-- plaid_txn_staging indexes
CREATE UNIQUE INDEX IF NOT EXISTS plaid_txn_staging_idempotency_idx
  ON plaid_txn_staging(source, external_id, chapter_id);
CREATE INDEX IF NOT EXISTS plaid_txn_staging_hash_idx
  ON plaid_txn_staging(hash) WHERE hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS plaid_txn_staging_status_idx
  ON plaid_txn_staging(status) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS plaid_txn_staging_chapter_idx
  ON plaid_txn_staging(chapter_id);

-- switch_txn_staging indexes
CREATE UNIQUE INDEX IF NOT EXISTS switch_txn_staging_idempotency_idx
  ON switch_txn_staging(source, external_id, chapter_id);
CREATE INDEX IF NOT EXISTS switch_txn_staging_hash_idx
  ON switch_txn_staging(hash) WHERE hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS switch_txn_staging_status_idx
  ON switch_txn_staging(status) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS switch_txn_staging_chapter_idx
  ON switch_txn_staging(chapter_id);

-- ============================================================================
-- 3. CATEGORY RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  merchant_pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS category_rules_source_idx ON category_rules(source);
CREATE INDEX IF NOT EXISTS category_rules_pattern_idx ON category_rules(merchant_pattern);

COMMENT ON TABLE category_rules IS 'Mapping rules for automatic transaction categorization based on merchant patterns';

-- ============================================================================
-- 4. INGESTION AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ingestion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL,
  source TEXT NOT NULL,
  staging_table TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_errored INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS ingestion_audit_chapter_idx ON ingestion_audit(chapter_id);
CREATE INDEX IF NOT EXISTS ingestion_audit_source_idx ON ingestion_audit(source);
CREATE INDEX IF NOT EXISTS ingestion_audit_started_idx ON ingestion_audit(started_at DESC);

COMMENT ON TABLE ingestion_audit IS 'Audit log for all staging data ingestion and reconciliation runs';

-- ============================================================================
-- 5. RECONCILIATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_reconcile_staging(
  p_staging_table TEXT DEFAULT NULL,
  p_chapter_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_audit_id UUID;
  v_records_processed INTEGER := 0;
  v_records_inserted INTEGER := 0;
  v_records_skipped INTEGER := 0;
  v_records_errored INTEGER := 0;
  v_error_details JSONB := '[]'::JSONB;
  v_staging_tables TEXT[] := ARRAY['transaction_staging', 'plaid_txn_staging', 'switch_txn_staging'];
  v_table TEXT;
  v_rec RECORD;
  v_category_id UUID;
  v_period_id UUID;
  v_matched_category TEXT;
  v_default_category_id UUID;
  v_current_period_id UUID;
BEGIN
  -- Determine which staging tables to process
  IF p_staging_table IS NOT NULL THEN
    v_staging_tables := ARRAY[p_staging_table];
  END IF;

  -- Loop through each staging table
  FOREACH v_table IN ARRAY v_staging_tables
  LOOP
    -- Create audit record for this run
    INSERT INTO ingestion_audit (
      chapter_id,
      source,
      staging_table,
      status
    ) VALUES (
      p_chapter_id,
      v_table,
      v_table,
      'running'
    ) RETURNING id INTO v_audit_id;

    -- Process records from staging table
    FOR v_rec IN EXECUTE format(
      'SELECT * FROM %I WHERE status = $1 AND ($2 IS NULL OR chapter_id = $2) ORDER BY ingested_at',
      v_table
    ) USING 'new', p_chapter_id
    LOOP
      BEGIN
        v_records_processed := v_records_processed + 1;

        -- Check for duplicates by hash (skip if already exists in expenses)
        IF v_rec.hash IS NOT NULL THEN
          IF EXISTS (
            SELECT 1 FROM expenses
            WHERE chapter_id = v_rec.chapter_id
              AND source = v_rec.source
              AND description = v_rec.description
              AND amount = v_rec.amount
              AND transaction_date::DATE = v_rec.date
          ) THEN
            -- Mark as processed (duplicate)
            EXECUTE format(
              'UPDATE %I SET status = $1, processed_at = now() WHERE id = $2',
              v_table
            ) USING 'processed', v_rec.id;
            v_records_skipped := v_records_skipped + 1;
            CONTINUE;
          END IF;
        END IF;

        -- Match category using category_rules
        SELECT category INTO v_matched_category
        FROM category_rules
        WHERE source = v_rec.source
          AND v_rec.description ~* merchant_pattern
        ORDER BY priority DESC, created_at DESC
        LIMIT 1;

        -- Get category_id from budget_categories
        IF v_matched_category IS NOT NULL THEN
          SELECT id INTO v_category_id
          FROM budget_categories
          WHERE chapter_id = v_rec.chapter_id
            AND name = v_matched_category
            AND is_active = true
          LIMIT 1;
        END IF;

        -- Fallback to default category if no match
        IF v_category_id IS NULL THEN
          SELECT id INTO v_default_category_id
          FROM budget_categories
          WHERE chapter_id = v_rec.chapter_id
            AND name = 'Uncategorized'
            AND is_active = true
          LIMIT 1;

          v_category_id := COALESCE(v_category_id, v_default_category_id);
        END IF;

        -- Get current period
        SELECT id INTO v_current_period_id
        FROM budget_periods
        WHERE chapter_id = v_rec.chapter_id
          AND is_current = true
        LIMIT 1;

        v_period_id := v_current_period_id;

        -- Skip if no valid category or period found
        IF v_category_id IS NULL OR v_period_id IS NULL THEN
          EXECUTE format(
            'UPDATE %I SET status = $1, processed_at = now() WHERE id = $2',
            v_table
          ) USING 'error', v_rec.id;
          v_records_errored := v_records_errored + 1;
          v_error_details := v_error_details || jsonb_build_object(
            'id', v_rec.id,
            'error', 'Missing category or period',
            'external_id', v_rec.external_id
          );
          CONTINUE;
        END IF;

        -- Insert into canonical expenses table
        INSERT INTO expenses (
          chapter_id,
          budget_id,
          category_id,
          period_id,
          amount,
          description,
          transaction_date,
          vendor,
          payment_method,
          status,
          source,
          notes
        ) VALUES (
          v_rec.chapter_id,
          NULL, -- budget_id to be determined later
          v_category_id,
          v_period_id,
          v_rec.amount,
          v_rec.description,
          v_rec.date,
          v_rec.description, -- use description as vendor for now
          NULL, -- payment_method unknown from staging
          'completed',
          v_rec.source,
          jsonb_build_object('external_id', v_rec.external_id, 'raw_data', v_rec.raw_data)::TEXT
        );

        -- Mark staging record as processed
        EXECUTE format(
          'UPDATE %I SET status = $1, processed_at = now() WHERE id = $2',
          v_table
        ) USING 'processed', v_rec.id;

        v_records_inserted := v_records_inserted + 1;

      EXCEPTION WHEN OTHERS THEN
        -- Log error and mark as errored
        EXECUTE format(
          'UPDATE %I SET status = $1, processed_at = now() WHERE id = $2',
          v_table
        ) USING 'error', v_rec.id;

        v_records_errored := v_records_errored + 1;
        v_error_details := v_error_details || jsonb_build_object(
          'id', v_rec.id,
          'error', SQLERRM,
          'external_id', v_rec.external_id
        );
      END;
    END LOOP;

    -- Update audit record
    UPDATE ingestion_audit
    SET
      records_processed = v_records_processed,
      records_inserted = v_records_inserted,
      records_skipped = v_records_skipped,
      records_errored = v_records_errored,
      error_details = v_error_details,
      completed_at = now(),
      status = CASE
        WHEN v_records_errored > 0 THEN 'completed'
        ELSE 'completed'
      END
    WHERE id = v_audit_id;

  END LOOP;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'records_processed', v_records_processed,
    'records_inserted', v_records_inserted,
    'records_skipped', v_records_skipped,
    'records_errored', v_records_errored,
    'error_details', v_error_details
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION fn_reconcile_staging IS 'Reconciles staging data into canonical expenses table with deduplication, categorization, and audit logging';

-- ============================================================================
-- 6. UNPROCESSED STAGING VIEW
-- ============================================================================

CREATE OR REPLACE VIEW unprocessed_staging_v AS
SELECT
  'transaction_staging' AS staging_table,
  id,
  chapter_id,
  source,
  external_id,
  date,
  amount,
  description,
  hash,
  status,
  ingested_at
FROM transaction_staging
WHERE status = 'new'

UNION ALL

SELECT
  'plaid_txn_staging' AS staging_table,
  id,
  chapter_id,
  source,
  external_id,
  date,
  amount,
  description,
  hash,
  status,
  ingested_at
FROM plaid_txn_staging
WHERE status = 'new'

UNION ALL

SELECT
  'switch_txn_staging' AS staging_table,
  id,
  chapter_id,
  source,
  external_id,
  date,
  amount,
  description,
  hash,
  status,
  ingested_at
FROM switch_txn_staging
WHERE status = 'new'

ORDER BY ingested_at;

COMMENT ON VIEW unprocessed_staging_v IS 'Unified view of all unprocessed staging records across all staging tables';

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all staging tables
ALTER TABLE transaction_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_txn_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE switch_txn_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS POLICIES - Chapter-scoped access
-- ============================================================================

-- transaction_staging policies
CREATE POLICY transaction_staging_chapter_isolation ON transaction_staging
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

-- plaid_txn_staging policies
CREATE POLICY plaid_txn_staging_chapter_isolation ON plaid_txn_staging
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

-- switch_txn_staging policies
CREATE POLICY switch_txn_staging_chapter_isolation ON switch_txn_staging
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

-- category_rules policies (readable by all authenticated users, writable by admins/exec)
CREATE POLICY category_rules_read ON category_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY category_rules_write ON category_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'exec')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'exec')
    )
  );

-- ingestion_audit policies
CREATE POLICY ingestion_audit_chapter_isolation ON ingestion_audit
  FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to compute hash for deduplication
CREATE OR REPLACE FUNCTION compute_txn_hash(
  p_external_id TEXT,
  p_source TEXT,
  p_date DATE,
  p_amount NUMERIC,
  p_description TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      COALESCE(p_external_id, '') || '|' ||
      COALESCE(p_source, '') || '|' ||
      COALESCE(p_date::TEXT, '') || '|' ||
      COALESCE(p_amount::TEXT, '') || '|' ||
      COALESCE(p_description, ''),
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 10. SAMPLE CATEGORY RULES (Optional - uncomment to use)
-- ============================================================================

/*
INSERT INTO category_rules (source, merchant_pattern, category, priority) VALUES
  ('CHASE', '(?i)(amazon|amzn)', 'Office Supplies', 10),
  ('CHASE', '(?i)(uber|lyft)', 'Transportation', 10),
  ('CHASE', '(?i)(restaurant|pizza|food)', 'Food & Dining', 10),
  ('SWITCH', '(?i)(dues|payment)', 'Membership Dues', 20),
  ('PLAID', '(?i)(venmo|paypal)', 'Transfers', 5),
  ('MANUAL', '.*', 'Uncategorized', 1)
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Insert data into staging
/*
INSERT INTO transaction_staging (chapter_id, source, external_id, date, amount, description, hash)
VALUES (
  'your-chapter-uuid',
  'CHASE',
  'chase_12345',
  '2025-01-15',
  -45.67,
  'Amazon.com purchase',
  compute_txn_hash('chase_12345', 'CHASE', '2025-01-15', -45.67, 'Amazon.com purchase')
);
*/

-- Example 2: Run reconciliation for all staging tables
/*
SELECT fn_reconcile_staging();
*/

-- Example 3: Run reconciliation for specific table and chapter
/*
SELECT fn_reconcile_staging('plaid_txn_staging', 'your-chapter-uuid');
*/

-- Example 4: View unprocessed records
/*
SELECT * FROM unprocessed_staging_v WHERE chapter_id = 'your-chapter-uuid';
*/

-- Example 5: Check audit log
/*
SELECT * FROM ingestion_audit
WHERE chapter_id = 'your-chapter-uuid'
ORDER BY started_at DESC
LIMIT 10;
*/
