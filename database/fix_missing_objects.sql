-- ============================================================================
-- FIX MISSING DATABASE OBJECTS
-- ============================================================================
-- Run this in Supabase SQL Editor to create missing views and functions
-- ============================================================================

-- ============================================================================
-- 1. CREATE UNPROCESSED STAGING VIEW (if not exists)
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

-- ============================================================================
-- 2. CREATE RECONCILIATION FUNCTION (if not exists)
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

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on view
GRANT SELECT ON unprocessed_staging_v TO authenticated;
GRANT SELECT ON unprocessed_staging_v TO anon;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION fn_reconcile_staging TO authenticated;
GRANT EXECUTE ON FUNCTION fn_reconcile_staging TO anon;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Missing objects created successfully!' AS status;
