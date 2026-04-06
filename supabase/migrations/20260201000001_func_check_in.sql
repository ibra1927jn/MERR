CREATE OR REPLACE FUNCTION check_in_picker(
    p_picker_id UUID,
    p_orchard_id UUID,
    p_verified_by UUID DEFAULT NULL
) RETURNS JSON 
LANGUAGE plpgsql SECURITY DEFINER 
AS $func$
DECLARE 
    v_today TEXT := to_char(NOW() AT TIME ZONE 'Pacific/Auckland', 'YYYY-MM-DD');
    v_now TEXT := REPLACE(CAST(NOW() AT TIME ZONE 'Pacific/Auckland' AS TEXT(19)), ' ', 'T');
    v_existing RECORD;
    v_new RECORD;
BEGIN 
    SELECT id INTO v_existing
    FROM daily_attendance
    WHERE picker_id = p_picker_id
        AND orchard_id = p_orchard_id
        AND date = v_today
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN 
        UPDATE pickers
        SET status = 'active'
        WHERE id = p_picker_id;

        RETURN json_build_object(
            'picker_id', p_picker_id,
            'status', 'present',
            'id', v_existing.id
        );
    END IF;

    INSERT INTO daily_attendance (
        picker_id,
        orchard_id,
        date,
        check_in_time,
        status,
        verified_by
    )
    VALUES (
        p_picker_id,
        p_orchard_id,
        v_today,
        v_now,
        'present',
        p_verified_by
    )
    RETURNING * INTO v_new;

    UPDATE pickers
    SET status = 'active'
    WHERE id = p_picker_id;

    RETURN json_build_object(
        'picker_id', p_picker_id,
        'status', 'present',
        'id', v_new.id
    );
END;
$func$;
