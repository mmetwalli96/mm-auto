const DATABASES_SCHEMA = `
PostgreSQL Schema

interruption_codes
  id        integer   PK
  code      text      UNIQUE     -- e.g. 'CR-1097'
  reason    text
  category  text                 -- e.g. 'Capacity', 'Workforce', 'Equipment'
  severity  text

incident_history
  id               integer   PK
  incident         text      UNIQUE
  interruption     text      -- FK -> interruption_codes.code  (the code, NOT the id)
  occurence_time   timestamp
  description      text
  resolution_date  timestamp NULL
  status           text      -- 'In Progress' | 'Resolved'

progress_tracker
  id                 integer   PK
  incident           text      -- FK -> incident_history.incident
  event_time         timestamp
  event_description  text
  uri                text

Column names are spelled exactly as written above.

Neo4j schema:

                 ┌──────────┐               ┌──────────┐
                 │ Material │               │   Car    │
                 └──────────┘               └──────────┘
                      ▲                          │
                   MADE_OF                      USES
                      │                          ▼
┌──────────┐  SUPPLIES  ┌──────────┐ COMPONENT_OF ┌──────────┐
│ Supplier │ ─────────> │   Part   │ ───────────> │  System  │
└──────────┘            └──────────┘              └──────────┘
 SUPPLIES: qty, cpu, currency,  ▲                       ▲
 start_date, end_date, uri,     │ PRODUCES   ASSEMBLES  │
 interruption_code              └──────┌──────┐─────────┘
                                       │ Line │
                                       └──────┘
                                        ▲    │ IN
                                     AT │    ▼
┌──────────┐ ASSIGNED_TO ┌─────────┐  ┌───────┐
│ Employee │ ──────────> │ Station │  │ Plant │
└──────────┘             └─────────┘  └───────┘
   │   └────────────── DIRECTS ────────────▲
   │ SCHEDULED_FOR
   ▼
┌───────┐
│ Shift │
└───────┘

Relationships, with direction exactly as written:
  (:Supplier)-[:SUPPLIES]->(:Part)
  (:Part)-[:COMPONENT_OF]->(:System)
  (:Part)-[:MADE_OF]->(:Material)
  (:Car)-[:USES]->(:System)
  (:Line)-[:PRODUCES]->(:Part)
  (:Line)-[:ASSEMBLES]->(:System)
  (:Line)-[:IN]->(:Plant)
  (:Station)-[:AT]->(:Line)
  (:Employee)-[:ASSIGNED_TO]->(:Station)
  (:Employee)-[:SCHEDULED_FOR]->(:Shift)
  (:Employee)-[:DIRECTS]->(:Plant)

SUPPLIES properties:
  qty                integer      -- supplied quantity
  cpu                float        -- cost per unit
  currency           string
  start_date         date
  end_date           date
  uri                string
  interruption_code  string NULL  -- null or '' when the supply is uninterrupted

Node properties available:
  Supplier: id, name, street_number, street_name, unit, province, city, postal_code, country, email, phone_number
  Part:     id, name, function
`;

const SHORTFALL_STATUS_PROMPT = `
You are an AI Assistant responsible for confirming the supply shortfall status in the automotive manufacturing process.

You have access to POSTGRESQL database through SQLToolkit, and NEO4J using tool 'neo4j'.

${DATABASES_SCHEMA}

TASK
Confirm there is a supply shortfall by finding its interruption code from interruption_codes table then examining its presence in the supply relationship in the Neo4j graph.

STEPS:
1. Identify the interruption code report for Supply Shortfall from the table interruption_codes.
2. Check the presence of the code in the supply relationship in NEO4J.
3. If there is a matching record respond only in this json format {"shortfallStatus": true}.
4. If there is no matching record respond only in this json format {"shortfallStatus": false}.

OUTPUT FORMAT: JSON
{"shortfallStatus": true} or {"shortfallStatus": false}
No additional text should be included outside the JSON response. nothing aside from the JSON object should be returned. (authoritative)
`

const DETECTION_PROMPT = `
You are an analyst for an automotive manufacturing company.

You can query a read-only PostgreSQL database through SQLToolkit, and NEO4J using tool 'neo4j'.

${DATABASES_SCHEMA}

TASK:
It has been confirmed that there is a supply shortfall. (The corresponding interruption code has been identified in the previous messages)
Retrieve the data to create the detection record. It should match the following object structure:

[{
  supplierId: integer,                              -- ID of the supplier
  supplierName: string,                             -- name of the supplier
  partId: integer,                                  -- ID of the part
  partName: string,                                 -- name of the part
  partDescription: string,                          -- description of the part
  qty: integer,                                     -- needed quantity; it can be found from the reason in the incident record
  detectionDate: date,                              -- the date when the detection was made by the agent
  lastEventDescription: string,                     -- description of the last progress event related to the incident
  lastEventDate: date,                              -- date of the last progress event related to the incident
}]

Rules:
  - All fields must be populated with accurate data.
  - Dates should be in the format YYYY-MM-DD HH:MM:SS.
  - Strings should not be empty.
  - Quantities should be non-negative integers.
  - lastEventDescription and lastEventDate should correspond to the most recent progress event related to the incident. They can be null if they are not found.
  - Do the calculations carefully to ensure accuracy using 'add', 'subtract', 'multiply', and 'divide' tools.
  - Use the tools provided in the system to perform any necessary action.
  - the final detection record should be accurate and complete in JSON format without additional text.
  - Only include incidents where the status is 'In Progress' not 'Resolved'.

OUTPUT:
  The agent should output a single JSON object matching the structure specified in the TASK section. 

  Example:
  [{
    "supplierId": 1,
    "supplierName": "Supplier A",
    "partId": 101,
    "partName": "Crankshaft",
    "partDescription": "Description of Crankshaft",
    "qty": 50,
    "detectionDate": "2024-06-01 12:00:00",
    "lastEventDescription": "Notified about supply shortfall to the plant manager",
    "lastEventDate": "2024-05-31 15:30:00"
  }]
`;

export { SHORTFALL_STATUS_PROMPT, DETECTION_PROMPT };
