import { tool } from "@langchain/core/tools";
import { StructuredToolInterface } from "@langchain/core/tools";
import { SqlToolkit } from "@langchain/classic/agents/toolkits/sql";
import { z } from "zod";

import { mailtrapClient, neo4jGraph, sqlDatabase, llm } from "@clients";
import { mailtrapConfig } from "@config";

const sendNotificationTool = tool(
    async (_input: { recipient: string, subject: string, message: string }) => {
        try {
            await mailtrapClient.send({
                from: mailtrapConfig.sender,
                to: [{ email: _input.recipient }],
                reply_to: { email: mailtrapConfig.inbox.address },
                subject: _input.subject,
                text: _input.message,
            });
        } catch (error) {
            console.error("Failed to send notification:", error);
            return { success: false, error: (error as Error).message };
        }

        return { success: true, sentTo: _input.recipient, sentAt: new Date().toISOString() };
    },
    {
        name: "SendEmail",
        description: "Send list of suppliers to the specified recipient",
        schema: z.object({
            recipient: z.email().describe("The email address of the recipient"),
            subject: z.string().describe("The subject of the email"),
            message: z.string().describe("The body of the email"),
        }),
    }
);

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

const sqlToolKit = new SqlToolkit(sqlDatabase, llm);

const combinedTools: StructuredToolInterface[] = [
    sendNotificationTool,
    neo4jTool,
    ...sqlToolKit.tools,
];

const toolsByName: Record<string, StructuredToolInterface> = Object.fromEntries(
    combinedTools.map(tool => [tool.name, tool])
);

const tools = Object.values(toolsByName);

export { tools, toolsByName }