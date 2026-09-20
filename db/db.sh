#!/usr/bin/env bash

# check if the docker container mm-auto is running and stop it if it is
docker stop mm-auto
docker rm mm-auto

# start the docker container mm-auto
docker run -d --name mm-auto -p 7474:7474 -p 7687:7687 -v $(pwd)/db/neo4j/data:/import --env NEO4J_AUTH=none neo4j:latest

# apply the Neo4j schema to the running container
docker exec -i mm-auto cypher-shell -u neo4j < db/neo4j/schema.cypher

