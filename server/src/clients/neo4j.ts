import { Neo4jGraph } from "@langchain/neo4j";

import { dbConfig } from "@config";

const neo4jGraph = new Neo4jGraph({
    url: `${dbConfig.neo4j.database}://${dbConfig.neo4j.host}:${dbConfig.neo4j.port}`,
    username: dbConfig.neo4j.username,
    password: dbConfig.neo4j.password,
});

export { neo4jGraph };