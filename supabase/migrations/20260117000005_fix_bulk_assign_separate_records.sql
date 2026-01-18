-- ============================================================================
-- FIX BULK ASSIGN DUES - CREATE SEPARATE RECORDS
-- ============================================================================
-- Each bulk assign should create separate dues records (line items) rather
-- than adding to existing ones. This allows tracking different fees separately.
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_assign_dues(
  p_chapter_id uuid,
  p_config_id uuid,
  p_amount numeric,
  p_year_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
  v_assigned int := 0;
  v_skipped int := 0;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  -- Verify caller has permission (admin, treasurer, or exec for this chapter)
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND chapter_id = p_chapter_id
      AND role IN ('admin', 'treasurer', 'exec')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission denied',
      'assigned', 0,
      'skipped', 0
    );
  END IF;

  -- Loop through matching members
  FOR v_member IN
    SELECT id, email, full_name, year
    FROM user_profiles
    WHERE chapter_id = p_chapter_id
      AND (p_year_filter IS NULL OR year = p_year_filter)
      AND (p_status_filter IS NULL OR status = p_status_filter)
  LOOP
    BEGIN
      -- Always create a new dues record (separate line item)
      INSERT INTO member_dues (
        chapter_id,
        member_id,
        email,
        config_id,
        base_amount,
        total_amount,
        balance,
        amount_paid,
        due_date,
        status,
        assigned_date
      ) VALUES (
        p_chapter_id,
        v_member.id,
        v_member.email,
        p_config_id,
        p_amount,
        p_amount,
        p_amount,
        0,
        p_due_date,
        'pending',
        NOW()
      );

      v_assigned := v_assigned + 1;

    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      v_errors := array_append(v_errors, v_member.email || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'assigned', v_assigned,
    'skipped', v_skipped,
    'errors', v_errors
  );
END;
$$;
