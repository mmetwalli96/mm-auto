TRUNCATE progress_tracker, incident_history, interruption_codes RESTART IDENTITY CASCADE;
\COPY interruption_codes(code, reason, category, severity) FROM PROGRAM 'gcloud storage cat gs://mm-auto/interruption_codes.csv' CSV HEADER
\COPY incident_history(incident, interruption, occurrence_time, description, resolution_date, status) FROM PROGRAM 'gcloud storage cat gs://mm-auto/incident_history.csv' CSV HEADER
\COPY progress_tracker(incident, event_time, event_description, uri) FROM PROGRAM 'gcloud storage cat gs://mm-auto/progress_tracker.csv' CSV HEADER
