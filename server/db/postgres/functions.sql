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
        'data', row_to_json(rec)
    );
    PERFORM pg_notify('table_update', payload::text);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
