CREATE TABLE IF NOT EXISTS interruption_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(50) NOT NULL,

    CHECK (severity IN ('Low', 'Medium', 'High'))
);

CREATE TABLE IF NOT EXISTS incident_history (
    id SERIAL PRIMARY KEY,
    incident VARCHAR(50) UNIQUE NOT NULL,
    interruption VARCHAR(50) NOT NULL,
    occurance_time TIMESTAMP NOT NULL,
    description TEXT NOT NULL,
    resolution_date TIMESTAMP DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'In Progress',
    CHECK (status IN ('In Progress', 'Resolved')),
    FOREIGN KEY (interruption) REFERENCES interruption_codes(code)
);

CREATE TABLE IF NOT EXISTS progress_tracker (
    id SERIAL PRIMARY KEY,
    incident VARCHAR(50) NOT NULL,
    event_time TIMESTAMP NOT NULL,
    event_description TEXT NOT NULL,
    uri TEXT DEFAULT NULL,
    FOREIGN KEY (incident) REFERENCES incident_history(incident)
);