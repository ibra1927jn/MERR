CREATE OR REPLACE FUNCTION correct_attendance(
    p_attendance_id UUID,
    p_check_in_time TEXT DEFAULT NULL,
    p_check_out_time TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT '',
    p_admin_id UUID DEFAULT NULL
) RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER 
AS $func$
DECLARE 
    v_existing RECORD;
    v_ci TEXT;
    v_co TEXT;
    v_hours NUMERIC;
    v_now TEXT := REPLACE(CAST(NOW() AT TIME ZONE 'Pacific/Auckland' AS TEXT(19)), ' ', 'T');
BEGIN 
    SELECT check_in_time, check_out_time INTO v_existing
    FROM daily_attendance
    WHERE id = p_attendance_id;

    v_ci := COALESCE(p_check_in_time, v_existing.check_in_time);
    v_co := COALESCE(p_check_out_time, v_existing.check_out_time);

    IF v_ci IS NOT NULL AND v_co IS NOT NULL THEN 
        v_hours := GREATEST(0, ROUND(EXTRACT(EPOCH FROM ((v_co::TIMESTAMPTZ) - (v_ci::TIMESTAMPTZ))) / 3600.0, 2));
    END IF;

    UPDATE daily_attendance
    SET check_in_time = COALESCE(p_check_in_time, check_in_time),
        check_out_time = COALESCE(p_check_out_time, check_out_time),
        hours_worked = COALESCE(v_hours, hours_worked),
        correction_reason = p_reason,
        corrected_by = p_admin_id,
        corrected_at = v_now
    WHERE id = p_attendance_id;

    INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        performed_by,
        new_values,
        notes
    )
    VALUES (
        'timesheet_correction',
        'daily_attendance',
        p_attendance_id::TEXT,
        p_admin_id::TEXT,
        json_build_object(
            'check_in_time', p_check_in_time,
            'check_out_time', p_check_out_time
        ),
        p_reason
    );
END;
$func$;
