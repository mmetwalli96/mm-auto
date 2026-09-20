// ============================================================
// Factory automation graph schema and data load
// ============================================================


// ------------------------------------------------------------
// 1. Constraints (also create the backing indexes)
// ------------------------------------------------------------


CREATE CONSTRAINT car_id IF NOT EXISTS FOR (c:Car) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT system_id IF NOT EXISTS FOR (s:System) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT part_id IF NOT EXISTS FOR (p:Part) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT material_id IF NOT EXISTS FOR (m:Material) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT plant_id IF NOT EXISTS FOR (pl:Plant) REQUIRE pl.id IS UNIQUE;
CREATE CONSTRAINT line_id IF NOT EXISTS FOR (l:Line) REQUIRE l.id IS UNIQUE;
CREATE CONSTRAINT station_id IF NOT EXISTS FOR (st:Station) REQUIRE st.id IS UNIQUE;
CREATE CONSTRAINT shift_id IF NOT EXISTS FOR (sh:Shift) REQUIRE sh.id IS UNIQUE;
CREATE CONSTRAINT employee_id IF NOT EXISTS FOR (e:Employee) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT supplier_id IF NOT EXISTS FOR (su:Supplier) REQUIRE su.id IS UNIQUE;


// ------------------------------------------------------------
// 2. Nodes
// ------------------------------------------------------------

LOAD CSV WITH HEADERS FROM 'file:///cars.csv' AS row
MERGE (c:Car {id: row.id})
SET c.model = row.model, c.year = toInteger(row.year), c.trim = row.trim;

LOAD CSV WITH HEADERS FROM 'file:///systems.csv' AS row
MERGE (s:System {id: row.id})
SET s.name = row.name, s.functionality = row.functionality;

LOAD CSV WITH HEADERS FROM 'file:///parts.csv' AS row
MERGE (p:Part {id: row.id})
SET p.name = row.name, p.function = row.function;

LOAD CSV WITH HEADERS FROM 'file:///materials.csv' AS row
MERGE (m:Material {id: row.id})
SET m.name = row.name;

LOAD CSV WITH HEADERS FROM 'file:///plants.csv' AS row
MERGE (pl:Plant {id: row.id})
SET pl.name = row.name, pl.street_number = row.street_number, pl.street_name = row.street_name,
    pl.unit = row.unit, pl.city = row.city, pl.province = row.province,
    pl.postal_code = row.postal_code, pl.country = row.country;

LOAD CSV WITH HEADERS FROM 'file:///lines.csv' AS row
MERGE (l:Line {id: row.id});

LOAD CSV WITH HEADERS FROM 'file:///stations.csv' AS row
MERGE (st:Station {id: row.id});

LOAD CSV WITH HEADERS FROM 'file:///shifts.csv' AS row
MERGE (sh:Shift {id: row.id})
SET sh.start = row.start, sh.end = row.end, sh.day = row.day, sh.name = row.name;

LOAD CSV WITH HEADERS FROM 'file:///organization_directory.csv' AS row
MERGE (e:Employee {id: row.id})
SET e.first_name = row.first_name, e.last_name = row.last_name, e.phone = row.phone,
    e.email = row.email, e.street_number = row.street_number, e.street_name = row.street_name,
    e.unit = row.unit, e.city = row.city, e.province = row.province,
    e.postal_code = row.postal_code, e.country = row.country, e.role = row.role,
    e.start_date = row.start_date;

LOAD CSV WITH HEADERS FROM 'file:///suppliers.csv' AS row
MERGE (su:Supplier {id: row.id})
SET su.name = row.name, su.street_number = row.street_number, su.street_name = row.street_name,
    su.unit = row.unit, su.province = row.province, su.city = row.city,
    su.postal_code = row.postal_code, su.country = row.country, su.email = row.email,
    su.phone_number = row.phone_number;


// ------------------------------------------------------------
// 3. Relationships
// ------------------------------------------------------------

// Car -[:USES]-> System
LOAD CSV WITH HEADERS FROM 'file:///uses.csv' AS row
MATCH (c:Car {id: row.car})
MATCH (s:System {id: row.system})
MERGE (c)-[r:USES {id: row.id}]->(s);

// Line -[:ASSEMBLES]-> System
LOAD CSV WITH HEADERS FROM 'file:///assemble.csv' AS row
MATCH (l:Line {id: row.line})
MATCH (s:System {id: row.system})
MERGE (l)-[r:ASSEMBLES {id: row.id}]->(s)
SET r.name = row.name, r.qty = toInteger(row.qty), r.cpu = toFloat(row.cpu), r.currency = row.currency,
    r.start_date = row.start_date, r.end_date = row.end_date;

// Part -[:COMPONENT_OF]-> System
LOAD CSV WITH HEADERS FROM 'file:///component_of.csv' AS row
MATCH (p:Part {id: row.part})
MATCH (s:System {id: row.system})
MERGE (p)-[r:COMPONENT_OF {id: row.id}]->(s);

// Part -[:MADE_OF]-> Material
LOAD CSV WITH HEADERS FROM 'file:///made_of.csv' AS row
MATCH (p:Part {id: row.part})
MATCH (m:Material {id: row.material})
MERGE (p)-[r:MADE_OF {id: row.id}]->(m);

// Line -[:PRODUCES]-> Part
LOAD CSV WITH HEADERS FROM 'file:///produce.csv' AS row
MATCH (l:Line {id: row.line})
MATCH (p:Part {id: row.product})
MERGE (l)-[r:PRODUCES {id: row.id}]->(p)
SET r.name = row.name, r.qty = toInteger(replace(row.qty, ',', '')), r.cpu = toFloat(row.cpu), r.currency = row.currency,
    r.start_date = row.start_date, r.end_date = row.end_date;

// Supplier -[:SUPPLIES]-> Part
LOAD CSV WITH HEADERS FROM 'file:///supply.csv' AS row
MATCH (su:Supplier {id: row.supplier})
MATCH (p:Part {id: row.part})
MERGE (su)-[r:SUPPLIES {id: row.id}]->(p)
SET r.qty = toInteger(row.qty), r.cpu = toFloat(row.cpu), r.currency = row.currency,
    r.start_date = row.start_date, r.end_date = row.end_date, r.uri = row.uri, r.interruption_code = row.interruption_code;

// Station -[:AT]-> Line
LOAD CSV WITH HEADERS FROM 'file:///at.csv' AS row
MATCH (st:Station {id: row.station})
MATCH (l:Line {id: row.line})
MERGE (st)-[r:AT {id: row.id}]->(l);

// Line -[:IN]-> Plant
LOAD CSV WITH HEADERS FROM 'file:///in.csv' AS row
MATCH (l:Line {id: row.line})
MATCH (pl:Plant {id: row.plant})
MERGE (l)-[r:IN {id: row.id}]->(pl);

// Employee -[:DIRECTS]-> Plant
LOAD CSV WITH HEADERS FROM 'file:///direct.csv' AS row
MATCH (e:Employee {id: row.director})
MATCH (pl:Plant {id: row.plant})
MERGE (e)-[r:DIRECTS {id: row.id}]->(pl)
SET r.start_date = row.start_date;

// Employee -[:ASSIGNED_TO]-> Station
LOAD CSV WITH HEADERS FROM 'file:///assigned_to.csv' AS row
MATCH (e:Employee {id: row.worker})
MATCH (st:Station {id: row.station})
MERGE (e)-[r:ASSIGNED_TO {id: row.id}]->(st);

// Employee -[:SCHEDULED_FOR]-> Shift
LOAD CSV WITH HEADERS FROM 'file:///scheduled_for.csv' AS row
MATCH (e:Employee {id: row.worker})
MATCH (sh:Shift {id: row.shift})
MERGE (e)-[r:SCHEDULED_FOR {id: row.id}]->(sh);


// ------------------------------------------------------------
// 4. Verification
// ------------------------------------------------------------

MATCH (n) RETURN labels(n)[0] AS label, count(*) AS nodes ORDER BY label;

MATCH ()-[r]->() RETURN type(r) AS rel, count(*) AS rels ORDER BY rel;
