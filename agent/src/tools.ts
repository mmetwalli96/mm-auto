import { tool } from "@langchain/core/tools";
import { neo4jGraph } from "./utils/neo4j";
import { SqlToolkit } from "@langchain/classic/agents/toolkits/sql";
import { z } from "zod";
import { sqlDatabase } from "./utils/postgres";
import { llm } from "./llm";

const neo4jTool = tool(
  async ({ cypher }: { cypher: string }) => {
    try {
      const result = await neo4jGraph.query(cypher);
      return JSON.stringify(result);
    } catch (error: any) {
      return `Error executing Cypher query: ${error.message}`;
    }
  },
  {
    name: "neo4j",
    description:
      "Execute a read Cypher query on the Neo4j graph database to fetch information",
    schema: z.object({
      cypher: z
        .string()
        .describe("The valid Cypher query to execute against Neo4j"),
    }),
  },
);

const sqlToolkit = new SqlToolkit(sqlDatabase, llm);
const tools = [neo4jTool, ...sqlToolkit.getTools()];



export { tools };