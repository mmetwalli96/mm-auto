DROP TRIGGER IF EXISTS incident_history_notify_trigger ON incident_history;
CREATE TRIGGER incident_history_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON incident_history
    FOR EACH ROW EXECUTE FUNCTION notify_table_change();

DROP TRIGGER IF EXISTS progress_tracker_notify_trigger ON progress_tracker;
CREATE TRIGGER progress_tracker_notify_trigger
    AFTER INSERT OR UPDATE OR DELETE ON progress_tracker
    FOR EACH ROW EXECUTE FUNCTION notify_table_change();