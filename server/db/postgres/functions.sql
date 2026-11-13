CREATE OR REPLACE FUNCTION notify_table_change() RETURNS trigger AS $$
DECLARE
    rec RECORD;
    payload JSON;
BEGIN
    IF TG_OP = 'DELETE' THEN
        rec := OLD;
    ELSE
        rec := NEW;
    END IF;

    payload := json_build_object(
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'id', rec.id,
        'record', row_to_json(rec)
    );

    IF octet_length(payload::text) > 7500 THEN
        payload := json_build_object(
            'table_name', TG_TABLE_NAME,
            'operation', TG_OP,
            'id', rec.id
        );
        RETURN NULL;
    END IF;

    PERFORM pg_notify('table_update', payload::text);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
