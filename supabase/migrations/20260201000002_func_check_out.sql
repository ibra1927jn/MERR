CREATE OR REPLACE FUNCTION check_out_picker(p_attendance_id UUID) 
RETURNS JSON 
LANGUAGE plpgsql SECURITY DEFINER 
AS $func$
DECLARE 
    v_now TEXT := REPLACE(CAST(NOW() AT TIME ZONE 'Pacific/Auckland' AS TEXT(19)), ' ', 'T');
    v_record RECORD;
    v_hours NUMERIC;
BEGIN 
    SELECT * INTO v_record
    FROM daily_attendance
    WHERE id = p_attendance_id;

    IF v_record IS NULL THEN 
        RAISE EXCEPTION 'Attendance record not found: %', p_attendance_id;
    END IF;

    IF v_record.check_in_time IS NOT NULL THEN 
        v_hours := ROUND(EXTRACT(EPOCH FROM ((v_now::TIMESTAMPTZ) - (v_record.check_in_time::TIMESTAMPTZ))) / 3600.0, 2);
        v_hours := GREATEST(v_hours, 0);
    END IF;

    UPDATE daily_attendance
    SET check_out_time = v_now,
        status = 'present',
        hours_worked = v_hours
    WHERE id = p_attendance_id;

    UPDATE pickers
    SET status = 'inactive'
    WHERE id = v_record.picker_id;

    RETURN json_build_object(
        'id', p_attendance_id,
        'picker_id', v_record.picker_id,
        'check_out_time', v_now,
        'hours_worked', v_hours
    );
END;
$func$;
