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

const SEARCH_PROMPT = `
You are an intelligent search assistant.

What you need to look for is alternative automotive suppliers. The Tavily Search tool can help you find relevant suppliers efficiently.

Your input is a an array of detection records. Here its structure:

{
  supplierId: integer,                              -- ID of the supplier
  supplierName: string,                             -- name of the supplier
  partId: integer,                                  -- ID of the part
  partName: string,                                 -- name of the part
  partDescription: string,                          -- description of the part
  qty: integer,                                     -- needed quantity; it can be found from the reason in the incident record
  detectionDate: date,                              -- the date when the detection was made by the agent
  lastEventDescription: string,                     -- description of the last progress event related to the incident
  lastEventDate: date,                              -- date of the last progress event related to the incident
}

You need to find the suppliers that can provide the parts listed in the detection records.

The schemas of the databases are as follows:
${DATABASES_SCHEMA}

TASK:
Find alternative suppliers for the parts listed in the detection records using the Tavily Search tool. For each supplier find its name, contact phone and email, and the address.
The address should include the street, city, state, and postal code. (e.g., "123 Main St, Springfield, IL, 62701")

OUTPUT FORMAT: (clean JSON)
[
  {
    partId: string,         -- ID of the part
    partName: string,       -- name of the part
    supplierName: string,   -- name of the supplier
    contactPhone: string,   -- contact phone of the supplier
    contactEmail: string,   -- contact email of the supplier
    address: string         -- address of the supplier including street, city, state, and postal code
  }
]

Rules:
- Only include suppliers that can provide the parts listed in the detection records.
- Ensure that the output is valid JSON.
- Do not include any additional text outside the JSON array.
- The suppliers should be in the same country as the original suppliers listed in the detection records.
- It is expected that each part listed in the detection records will have at least one alternative supplier.

Example:
[
  {
    partId: "P-0123",
    partName: "Brake Pad",
    supplierName: "AutoParts Co.",
    contactPhone: "416-456-7890",
    contactEmail: "contact@autoparts.com",
    address: "250 Front St, Toronto, ON, M5V 3G5"
  },
  {
    partId: "P-0123",
    partName: "Brake Pad",
    supplierName: "FilterWorld Inc.",
    contactPhone: "216-506-3857",
    contactEmail: "info@filterworld.com",
    address: "1185 Bloor St W, Toronto, ON, M6H 1M9"
  },
  {
    partId: "P-0124",
    partName: "Oil Filter",
    supplierName: "FilterWorld Inc.",
    contactPhone: "519-654-3210",
    contactEmail: "info@filterworld.com",
    address: "32 College Ave W, Guelph, ON, N1G 1G1"
  }
]

`;

export { SEARCH_PROMPT };
