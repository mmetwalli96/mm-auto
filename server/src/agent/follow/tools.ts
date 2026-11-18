import { tool } from "@langchain/core/tools";
import { StructuredToolInterface } from "@langchain/core/tools";
import { SqlToolkit } from "@langchain/classic/agents/toolkits/sql";
import { z } from "zod";

import { mailtrapClient, sqlDatabase, llm, neo4jGraph } from "@clients";
import { mailtrapConfig } from "@config";

const FORBIDDEN_CYPHER = /\b(DELETE|DETACH|DROP|LOAD\s+CSV)\b/i;
const WRITE_CYPHER = /\b(CREATE|MERGE|SET|REMOVE)\b/i;
const ALLOWED_WRITE = /:SUPPLIES\b[\s\S]*\bREMOVE\s+\w+\.interruption_code\b/i;

const replyEmailTool = tool(
    async (_input: { message: string, messageId: string }) => {
        try {
            await mailtrapClient.inbound.messages.reply(
                mailtrapConfig.inbox.id,
                _input.messageId,
                {
                    text: _input.message,
                }
            );
        } catch (error) {
            console.error("Failed to send notification:", error);
            return { success: false, error: (error as Error).message };
        }

        return { success: true, sentAt: new Date().toISOString() };
    },
    {
        name: "ReplyEmail",
        description: "Reply to an email in the specified thread",
        schema: z.object({
            message: z.string().describe("The body of the email"),
            messageId: z.string().describe("The unique identifier for the email thread"),
        }),
    }
);

const neo4jTool = tool(
    async ({ cypher }: { cypher: string }) => {
        if (FORBIDDEN_CYPHER.test(cypher)) {
            return "Error: deleting or dropping data is not allowed. Use a read query, or REMOVE interruption_code from a SUPPLIES relationship.";
        }
        if (WRITE_CYPHER.test(cypher) && !ALLOWED_WRITE.test(cypher)) {
            return "Error: the only permitted write is removing interruption_code from a SUPPLIES relationship, e.g. MATCH (:Supplier)-[r:SUPPLIES {id: '<supply_id>'}]->(:Part) REMOVE r.interruption_code RETURN r.id, r.interruption_code";
        }
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
            "Execute a Cypher query on the Neo4j factory graph. Use read queries (MATCH ... RETURN) to fetch information about suppliers, parts, lines and plants. " +
            "The only permitted write is removing the interruption_code property from a (Supplier)-[:SUPPLIES]->(Part) relationship once its shortfall incident is fully resolved: " +
            "MATCH (:Supplier)-[r:SUPPLIES {id: '<supply_id>'}]->(:Part) REMOVE r.interruption_code RETURN r.id AS supply_id, r.interruption_code AS interruption_code. " +
            "Always find the relationship id with a read query first. Never delete nodes or relationships.",
        schema: z.object({
            cypher: z
                .string()
                .describe(
                    "A valid Cypher query: a read query, or the REMOVE r.interruption_code update on a SUPPLIES relationship",
                ),
        }),
    },
);

const getEmailsTool = tool(
    async (_input: { messageId: string }) => {
        try {
            const messageDetails = await mailtrapClient.inbound.messages.get(
                mailtrapConfig.inbox.id,
                _input.messageId
            );

            const threadDetails = await mailtrapClient.inbound.threads.get(
                mailtrapConfig.inbox.id,
                messageDetails.thread_id!
            );
            return { success: true, messages: threadDetails.messages };
        } catch (error) {
            console.error("Failed to get email:", error);
            return { success: false, error: (error as Error).message };
        }
    },
    {
        name: "GetEmails",
        description: "Retrieve all emails in the thread associated with the given message ID",
        schema: z.object({
            messageId: z.string().describe("The unique identifier for the email message"),
        }),
    }
);

const add = tool(({ a, b }) => a + b, {
    name: "add",
    description: "Add two numbers",
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
    replyEmailTool,
    getEmailsTool,
    add,
    subtract,
    neo4jTool,
    ...sqlToolKit.tools,
];

const toolsByName: Record<string, StructuredToolInterface> = Object.fromEntries(
    combinedTools.map(tool => [tool.name, tool])
);

const tools = Object.values(toolsByName);

export { tools, toolsByName }