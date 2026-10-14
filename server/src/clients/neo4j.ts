import { Neo4jGraph } from "@langchain/neo4j";

import { dbConfig } from "@config";


const neo4jGraph = new Neo4jGraph({
    url: dbConfig.neo4j.uri,
    username: dbConfig.neo4j.username,
    password: dbConfig.neo4j.password,
    database: dbConfig.neo4j.database,
});

export { neo4jGraph };