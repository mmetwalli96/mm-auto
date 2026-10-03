import { tool } from "@langchain/core/tools";
import { StructuredToolInterface } from "@langchain/core/tools";
import { SqlToolkit } from "@langchain/classic/agents/toolkits/sql";
import { z } from "zod";

import { neo4jGraph } from "@clients";
import { sqlDatabase } from "@clients";
import { llm } from "@clients";

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

const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const subtract = tool(({ a, b }) => a - b, {
  name: "subtract",
  description: "Subtract two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const sqlToolKit = new SqlToolkit(sqlDatabase, llm);

const combinedTools: StructuredToolInterface[] = [
  neo4jTool,
  add,
  multiply,
  divide,
  subtract,
  ...sqlToolKit.getTools(),
];
const toolsByName: Record<string, StructuredToolInterface> = Object.fromEntries(
  combinedTools.map((tool) => [tool.name, tool]),
);
const tools = Object.values(toolsByName);

export { tools, toolsByName };
