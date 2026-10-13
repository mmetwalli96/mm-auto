# Project Setup

## DB Setup

In this project there are two databases ```NEO4J``` and ```POSTGRESQL```. Here are the instructions to set them up. 

**You should be in root directory of the project ```factory_automation```**

### NEO4J

1. Run the Docker image

```bash
docker run -d --name mm-auto -p 7474:7474 -p 7687:7687 -v $(pwd)/db/neo4j/data:/import --env NEO4J_AUTH=none neo4j:latest
```

2. Execute the shcema cypher file

```bash
docker exec -i mm-auto cypher-shell -u neo4j < db/neo4j/schema.cypher
```

### POSTGRESQL

1. Run the Docker image

```bash
docker run --rm --name mm-postgres -e POSTGRES_USER=mmetwalli -e POSTGRES_PASSWORD=admin1996 -e POSTGRES_DB=postgres -p 5432:5432 -dt --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5 postgres
```

2. Seed the data into the database

```bash
docker cp db/postgres mm-postgres:/db && docker exec -it mm-postgres psql -U mmetwalli -d postgres -f db/schema.sql -f db/seed.sql
```

This shell script ```db/db.sh``` can run the above commands at once. Make it an executable using

```bash
chmod +x db/db.sh
```

## Schedular

***```Agenda```*** is the shcedular used here. Its backend is **MongoDB** for its flexible schema. 

### MONGO

Run the Docker image 

```bash
docker run --name agenda-schedular -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=mmetwalli -e MONGO_INITDB_ROOT_PASSWORD=x0rxJtPP0UA6jFAS -d mongo:7.0
```

Access the data base

```bash
docker exec -it agenda-schedular mongosh -u mmetwalli -p x0rxJtPP0UA6jFAS --authenticationDatabase admin
```