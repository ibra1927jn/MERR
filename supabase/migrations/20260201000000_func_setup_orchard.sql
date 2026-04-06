CREATE OR REPLACE FUNCTION setup_orchard_atomic(
    p_code TEXT,
    p_name TEXT,
    p_location TEXT DEFAULT NULL,
    p_total_rows INT DEFAULT 0,
    p_start_time TEXT DEFAULT '07:00',
    p_piece_rate NUMERIC DEFAULT 6.5
) RETURNS JSON 
LANGUAGE plpgsql SECURITY DEFINER 
AS $func$
DECLARE 
    v_orchard RECORD;
    v_today TEXT := to_char(NOW() AT TIME ZONE 'Pacific/Auckland', 'YYYY-MM-DD');
BEGIN 
    INSERT INTO orchards (code, name, location, total_rows)
    VALUES (p_code, p_name, p_location, p_total_rows)
    RETURNING * INTO v_orchard;

    INSERT INTO day_setups (orchard_id, date, start_time, piece_rate)
    VALUES (
        v_orchard.id,
        v_today,
        p_start_time,
        p_piece_rate
    );

    RETURN json_build_object(
        'id', v_orchard.id,
        'code', v_orchard.code,
        'name', v_orchard.name
    );
END;
$func$;
