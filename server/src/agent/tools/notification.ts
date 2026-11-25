import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { mailtrapConfig } from "@config";
import { mailtrapClient } from "@clients";

export const sendNotificationTool = tool(
    async ({ recipient, subject, message }: { recipient: string, subject: string, message: string }) => {
        try {
            await mailtrapClient.send({
                from: mailtrapConfig.sender,
                to: [{ email: recipient }],
                reply_to: { email: mailtrapConfig.inbox.address },
                subject: subject,
                text: message,
            });
        } catch (error) {
            console.error("Failed to send notification:", error);
            return { success: false, error: (error as Error).message };
        }

        return { success: true, sentTo: recipient, sentAt: new Date().toISOString() };
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

export const replyEmailTool = tool(
    async (email: { message: string; messageId: string }) => {
        try {
            await mailtrapClient.inbound.messages.reply(
                mailtrapConfig.inbox.id,
                email.messageId,
                {
                    from: {
                        email: mailtrapConfig.inbox.address,
                        name: mailtrapConfig.inbox.name,
                    },
                    text: email.message,
                }
            );
        } catch (error) {
            console.error("Failed to send reply:", error);
            return { success: false, error: (error as Error).message };
        }

        return { success: true, sentAt: new Date().toISOString() };
    },
    {
        name: "ReplyEmail",
        description: "Reply to an inbound email message",
        schema: z.object({
            message: z.string().describe("The plain-text body of the reply"),
            messageId: z.string().describe("The ID of the inbound message being replied to"),
        }),
    }
);

export const getEmailsTool = tool(
    async (email: { messageId: string }) => {
        try {
            const messageDetails = await mailtrapClient.inbound.messages.get(
                mailtrapConfig.inbox.id,
                email.messageId
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