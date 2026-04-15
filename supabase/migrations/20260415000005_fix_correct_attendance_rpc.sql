-- fix(db): rewrite correct_attendance eliminando TEXT(19) y alineando columnas check_in/check_out
-- Los parametros p_check_in_time/p_check_out_time se mantienen por retrocompatibilidad de llamadas externas,
-- pero internamente operan sobre las columnas check_in/check_out (timestamptz).
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
    v_ci       TIMESTAMPTZ;
    v_co       TIMESTAMPTZ;
    v_hours    NUMERIC;
BEGIN
    SELECT check_in, check_out INTO v_existing
    FROM daily_attendance
    WHERE id = p_attendance_id;

    -- Convertir parametros TEXT a timestamptz; usar valor existente si no se pasa nuevo
    v_ci := COALESCE(p_check_in_time::TIMESTAMPTZ,  v_existing.check_in);
    v_co := COALESCE(p_check_out_time::TIMESTAMPTZ, v_existing.check_out);

    IF v_ci IS NOT NULL AND v_co IS NOT NULL THEN
        v_hours := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_co - v_ci)) / 3600.0, 2));
    END IF;

    UPDATE daily_attendance
    SET check_in         = COALESCE(p_check_in_time::TIMESTAMPTZ,  check_in),
        check_out        = COALESCE(p_check_out_time::TIMESTAMPTZ, check_out),
        hours_worked     = COALESCE(v_hours, hours_worked),
        correction_reason = p_reason,
        corrected_by     = p_admin_id,
        corrected_at     = NOW()
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
            'check_in',  p_check_in_time,
            'check_out', p_check_out_time
        ),
        p_reason
    );
END;
$func$;
