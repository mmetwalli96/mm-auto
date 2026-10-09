import { tool } from "@langchain/core/tools";
import { StructuredToolInterface } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";

import { neo4jGraph} from "@clients";
import { tavilyConfig } from "@config";

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

const tavilySearch = new TavilySearch({
  maxResults: tavilyConfig.maxResults,
  tavilyApiKey: tavilyConfig.apiKey,
});

const combinedTools: StructuredToolInterface[] = [neo4jTool, tavilySearch];

const toolsByName: Record<string, StructuredToolInterface> = Object.fromEntries(
  combinedTools.map((tool) => [tool.name, tool]),
);
const tools = Object.values(toolsByName);

export { tools, toolsByName };
