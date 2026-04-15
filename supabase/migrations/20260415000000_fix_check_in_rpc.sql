-- fix(db): rewrite check_in_picker eliminando cast TEXT(19) invalido
-- y alineando columnas con el schema real (check_in, no check_in_time)
CREATE OR REPLACE FUNCTION check_in_picker(
    p_picker_id UUID,
    p_orchard_id UUID,
    p_verified_by UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $func$
DECLARE
    v_today DATE := (NOW() AT TIME ZONE 'Pacific/Auckland')::DATE;
    v_now   TIMESTAMPTZ := NOW();
    v_existing RECORD;
    v_new RECORD;
BEGIN
    -- Buscar si ya existe registro de asistencia hoy
    SELECT id INTO v_existing
    FROM daily_attendance
    WHERE picker_id  = p_picker_id
      AND orchard_id = p_orchard_id
      AND date       = v_today
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
        -- Picker ya fichado — solo actualizar estado en pickers
        UPDATE pickers
        SET status = 'active'
        WHERE id = p_picker_id;

        RETURN json_build_object(
            'picker_id', p_picker_id,
            'status',    'present',
            'id',        v_existing.id
        );
    END IF;

    -- Insertar nuevo registro de asistencia
    INSERT INTO daily_attendance (
        picker_id,
        orchard_id,
        date,
        check_in,
        status,
        recorded_by
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
        'status',    'present',
        'id',        v_new.id
    );
END;
$func$;
