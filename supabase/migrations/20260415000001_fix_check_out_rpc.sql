-- fix(db): rewrite check_out_picker eliminando cast TEXT(19) invalido
-- y alineando columnas con el schema real (check_in/check_out, no _time)
CREATE OR REPLACE FUNCTION check_out_picker(p_attendance_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $func$
DECLARE
    v_now    TIMESTAMPTZ := NOW();
    v_record RECORD;
    v_hours  NUMERIC;
BEGIN
    SELECT * INTO v_record
    FROM daily_attendance
    WHERE id = p_attendance_id;

    IF v_record IS NULL THEN
        RAISE EXCEPTION 'Attendance record not found: %', p_attendance_id;
    END IF;

    -- Calcular horas solo si existe check_in
    IF v_record.check_in IS NOT NULL THEN
        v_hours := ROUND(EXTRACT(EPOCH FROM (v_now - v_record.check_in)) / 3600.0, 2);
        v_hours := GREATEST(v_hours, 0);
    END IF;

    UPDATE daily_attendance
    SET check_out    = v_now,
        status       = 'present',
        hours_worked = v_hours
    WHERE id = p_attendance_id;

    UPDATE pickers
    SET status = 'inactive'
    WHERE id = v_record.picker_id;

    RETURN json_build_object(
        'id',          p_attendance_id,
        'picker_id',   v_record.picker_id,
        'check_out',   v_now,
        'hours_worked', v_hours
    );
END;
$func$;
