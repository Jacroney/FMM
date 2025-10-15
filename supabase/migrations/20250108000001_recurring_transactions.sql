-- ============================================================================
-- RECURRING TRANSACTIONS & CASH FLOW FORECASTING
-- ============================================================================
-- Creates tables and functions for recurring transactions and cash flow forecasting
-- ============================================================================

-- ============================================================================
-- 1. RECURRING TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL, -- positive = income, negative = expense
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_due_date DATE NOT NULL,
  category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  period_id UUID REFERENCES budget_periods(id) ON DELETE SET NULL,
  payment_method TEXT,
  auto_post BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS recurring_transactions_chapter_idx ON recurring_transactions(chapter_id);
CREATE INDEX IF NOT EXISTS recurring_transactions_next_due_idx ON recurring_transactions(next_due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS recurring_transactions_category_idx ON recurring_transactions(category_id);

COMMENT ON TABLE recurring_transactions IS 'Stores recurring transactions that auto-generate expenses';
COMMENT ON COLUMN recurring_transactions.amount IS 'Positive for income, negative for expenses';
COMMENT ON COLUMN recurring_transactions.auto_post IS 'If true, automatically creates transaction on due date';

-- ============================================================================
-- 2. AUTOMATION AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL DEFAULT 'recurring_transactions',
  run_time TIMESTAMPTZ DEFAULT now(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_errored INTEGER DEFAULT 0,
  errors TEXT[],
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS automation_audit_run_time_idx ON automation_audit(run_time DESC);
CREATE INDEX IF NOT EXISTS automation_audit_chapter_idx ON automation_audit(chapter_id);

COMMENT ON TABLE automation_audit IS 'Audit log for automated jobs and recurring transaction processing';

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_audit ENABLE ROW LEVEL SECURITY;

-- recurring_transactions policies (chapter-scoped)
CREATE POLICY recurring_transactions_chapter_isolation ON recurring_transactions
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

-- automation_audit policies (read-only for users)
CREATE POLICY automation_audit_chapter_isolation ON automation_audit
  FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate next due date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  base_date DATE,
  frequency_type TEXT
) RETURNS DATE AS $$
BEGIN
  RETURN CASE frequency_type
    WHEN 'daily' THEN base_date + INTERVAL '1 day'
    WHEN 'weekly' THEN base_date + INTERVAL '1 week'
    WHEN 'biweekly' THEN base_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN base_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN base_date + INTERVAL '3 months'
    WHEN 'yearly' THEN base_date + INTERVAL '1 year'
    ELSE base_date + INTERVAL '1 month'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to process due recurring transactions
CREATE OR REPLACE FUNCTION process_recurring_transactions()
RETURNS JSONB AS $$
DECLARE
  v_audit_id UUID;
  v_records_processed INTEGER := 0;
  v_records_inserted INTEGER := 0;
  v_records_updated INTEGER := 0;
  v_records_errored INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_rec RECORD;
BEGIN
  -- Create audit record
  INSERT INTO automation_audit (
    job_type,
    status
  ) VALUES (
    'recurring_transactions',
    'running'
  ) RETURNING id INTO v_audit_id;

  -- Process each due recurring transaction
  FOR v_rec IN
    SELECT * FROM recurring_transactions
    WHERE is_active = true
      AND auto_post = true
      AND next_due_date <= CURRENT_DATE
    ORDER BY next_due_date
  LOOP
    BEGIN
      v_records_processed := v_records_processed + 1;

      -- Insert into expenses table
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
        NULL, -- budget_id determined later
        v_rec.category_id,
        v_rec.period_id,
        v_rec.amount,
        v_rec.name || COALESCE(' - ' || v_rec.description, ''),
        v_rec.next_due_date,
        v_rec.name,
        v_rec.payment_method,
        'completed',
        'RECURRING',
        'Auto-generated from recurring transaction'
      );

      v_records_inserted := v_records_inserted + 1;

      -- Update next due date
      UPDATE recurring_transactions
      SET
        next_due_date = calculate_next_due_date(next_due_date, frequency),
        updated_at = now()
      WHERE id = v_rec.id;

      v_records_updated := v_records_updated + 1;

    EXCEPTION WHEN OTHERS THEN
      v_records_errored := v_records_errored + 1;
      v_errors := array_append(v_errors,
        format('Error processing recurring transaction %s: %s', v_rec.id, SQLERRM)
      );
    END;
  END LOOP;

  -- Update audit record
  UPDATE automation_audit
  SET
    records_processed = v_records_processed,
    records_inserted = v_records_inserted,
    records_updated = v_records_updated,
    records_errored = v_records_errored,
    errors = v_errors,
    completed_at = now(),
    status = CASE
      WHEN v_records_errored > 0 THEN 'completed'
      ELSE 'completed'
    END
  WHERE id = v_audit_id;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'audit_id', v_audit_id,
    'records_processed', v_records_processed,
    'records_inserted', v_records_inserted,
    'records_updated', v_records_updated,
    'records_errored', v_records_errored,
    'errors', v_errors
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FORECAST BALANCE VIEW
-- ============================================================================

-- View to project future balance based on actual + recurring transactions
CREATE OR REPLACE VIEW forecast_balance_view AS
WITH all_transactions AS (
  -- Historical actual transactions
  SELECT
    e.transaction_date::date AS date,
    e.amount,
    e.chapter_id,
    'actual' AS source_type
  FROM expenses e
  WHERE e.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    AND e.status = 'completed'

  UNION ALL

  -- Future recurring transactions (next 90 days)
  SELECT
    rt.next_due_date AS date,
    rt.amount,
    rt.chapter_id,
    'recurring' AS source_type
  FROM recurring_transactions rt
  WHERE rt.is_active = true
    AND rt.next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
),
daily_totals AS (
  SELECT
    date,
    chapter_id,
    SUM(amount) AS daily_amount,
    ARRAY_AGG(DISTINCT source_type) AS sources
  FROM all_transactions
  GROUP BY date, chapter_id
),
starting_balance AS (
  -- Calculate starting balance (all transactions before 30 days ago)
  SELECT
    e.chapter_id,
    COALESCE(SUM(e.amount), 0) AS balance
  FROM expenses e
  WHERE e.transaction_date < CURRENT_DATE - INTERVAL '30 days'
    AND e.status = 'completed'
  GROUP BY e.chapter_id
)
SELECT
  dt.date,
  dt.chapter_id,
  dt.daily_amount,
  dt.sources,
  COALESCE(sb.balance, 0) + SUM(dt.daily_amount) OVER (
    PARTITION BY dt.chapter_id
    ORDER BY dt.date
    ROWS UNBOUNDED PRECEDING
  ) AS projected_balance
FROM daily_totals dt
LEFT JOIN starting_balance sb ON sb.chapter_id = dt.chapter_id
ORDER BY dt.chapter_id, dt.date;

COMMENT ON VIEW forecast_balance_view IS 'Projects future balance based on historical and recurring transactions';

-- Grant permissions
GRANT SELECT ON forecast_balance_view TO authenticated;
GRANT SELECT ON forecast_balance_view TO anon;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_transactions_updated_at
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_transactions_updated_at();

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Recurring transactions system created successfully!' AS status;
