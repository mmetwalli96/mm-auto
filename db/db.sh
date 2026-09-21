#!/usr/bin/env bash

# start the docker container mm-auto
docker run --rm -d --name mm-neo4j -p 7474:7474 -p 7687:7687 -v $(pwd)/db/neo4j/data:/import --env NEO4J_AUTH=none neo4j:latest

sleep 5

# apply the Neo4j schema to the running container
docker exec -i mm-neo4j cypher-shell -u neo4j < db/neo4j/schema.cypher

# start the docker container mm-postgres
docker run --rm --name mm-postgres -e POSTGRES_USER=mmetwalli -e POSTGRES_PASSWORD=admin1996 -e POSTGRES_DB=postgres -p 5432:5432 -dt --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5 postgres

# seed the database
docker cp db/postgres mm-postgres:/db && docker exec -it mm-postgres psql -U mmetwalli -d postgres -f db/schema.sql -f db/seed.sql

