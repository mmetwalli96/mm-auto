# Project Setup

## DB Setup

In this project there are two databases ```NEO4J``` and ```POSTGRESQL```. Here are the instructions to set them up running. 

### NEO4J

make suer you are in the project root folder ```factory_automation```

1. Run the docker image

```bash
docker run -d --name mm-auto -p 7474:7474 -p 7687:7687 -v $(pwd)/db/neo4j/data:/import --env NEO4J_AUTH=none neo4j:latest
```

2. Execute the shcema cypher file

```bash
docker exec -i mm-auto cypher-shell -u neo4j < db/neo4j/schema.cypher
```

