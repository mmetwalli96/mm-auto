import { tool } from "@langchain/core/tools";
import { StructuredToolInterface } from "@langchain/core/tools";
import { SqlToolkit } from "@langchain/classic/agents/toolkits/sql";
import { z } from "zod";

import { mailtrapClient, sqlDatabase, llm } from "@clients";
import { mailtrapConfig } from "@config";


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
    ...sqlToolKit.tools,
];

const toolsByName: Record<string, StructuredToolInterface> = Object.fromEntries(
    combinedTools.map(tool => [tool.name, tool])
);

const tools = Object.values(toolsByName);

export { tools, toolsByName }