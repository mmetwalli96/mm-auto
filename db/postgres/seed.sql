BEGIN;
\COPY interruption_codes(code, reason, category, severity) FROM 'db/data/interruption_codes.csv' DELIMITER ',' CSV HEADER;
\COPY incident_history(incident, interruption, occurrence_time, description, resolution_date, status) FROM 'db/data/incident_history.csv' DELIMITER ',' CSV HEADER;
\COPY progress_tracker(incident, event_time, event_description, uri) FROM 'db/data/progress_tracker.csv' DELIMITER ',' CSV HEADER;
COMMIT;