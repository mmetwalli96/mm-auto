import {
    SystemMessage,
    AIMessage,
    HumanMessage,
} from "@langchain/core/messages";
import {
    StateSchema,
    MessagesValue,
    ReducedValue,
    StateGraph,
    GraphNode,
    START,
    END,
    ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { RecipientSchema } from "@schemas";
import { readNeo4jTool, addEventTool } from "@/agent/tools/query";
import { sendNotificationTool } from "@/agent/tools/notification";
import { createCheckpointer } from "@utils";
import { llm } from "@clients";
import { FIND_PLANT_DIRECTOR_PROMPT, NOTIFY_PROMPT } from "@/agent/prompts";

const checkpointer = createCheckpointer("notifier");

const NotificationNodeState = new StateSchema({
    messages: MessagesValue,
    llmCalls: new ReducedValue(z.number().default(0), {
        reducer: (prev, curr) => prev + curr,
    }),
    recipients: new ReducedValue(z.array(RecipientSchema).default([]), {
        reducer: (prev, curr) => [...prev, ...curr],
    }),
});

type NotificationNodeStateType = typeof NotificationNodeState;

const findPlantDirectorNode: GraphNode<NotificationNodeStateType> = async (state) => {
    const llmWithTools = llm.bindTools([readNeo4jTool]);
    const systemMessage = new SystemMessage(FIND_PLANT_DIRECTOR_PROMPT);

    const response = await llmWithTools.invoke([systemMessage, ...state.messages]);
    return {
        messages: [response],
        llmCalls: 1,
    };

};

const parseRecipientsNode: GraphNode<NotificationNodeStateType> = async (state) => {
    const schema = z.array(RecipientSchema);
    const lastMessage = state.messages.at(-1);

    try {
        const raw = lastMessage!.text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

        const parsed = schema.parse(JSON.parse(raw));

        return {
            recipients: parsed,
        };
    } catch (error) {
        console.error("Failed to parse recipients JSON:", error);
        console.error("Raw LLM response:", lastMessage!.text);
        return {
            messages: [
                new HumanMessage(
                    `Failed to parse recipients JSON. ${error}. Please correct it using this response as context: ${lastMessage!.text}. Here is the schema: ${JSON.stringify(schema.toJSONSchema())}. You have found the recipients but they are not in the correct format.`,
                ),
            ],
        };
    }
};

const notifyNode: GraphNode<NotificationNodeStateType> = async (state) => {
    const llmWithTools = llm.bindTools([addEventTool, sendNotificationTool]);
    const systemMessage = new SystemMessage(NOTIFY_PROMPT(JSON.stringify(state.recipients)));
    const response = await llmWithTools.invoke([systemMessage, ...state.messages]);

    return {
        messages: [response],
        llmCalls: 1,
    };

};

const shouldParseRecipients: ConditionalEdgeRouter<NotificationNodeStateType> = async (
    state,
) => {
    const lastMessage = state.messages.at(-1);

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
        return "parseRecipientsNode";
    }
    if (lastMessage.tool_calls?.length) {
        return "findPlantDirectorToolNode";
    }
    return "parseRecipientsNode";
};

const shouldContinue: ConditionalEdgeRouter<NotificationNodeStateType> = async (
    state,
) => {
    if (state.recipients.length > 0) {
        return "notifyNode";
    }

    return "findPlantDirectorNode";
};

const shouldNotify: ConditionalEdgeRouter<NotificationNodeStateType> = async (
    state,
) => {
    const lastMessage = state.messages.at(-1);

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
        return END;
    }
    if (lastMessage.tool_calls?.length) {
        return "notifyToolNode";
    }
    return END;
};

export const notifier = new StateGraph(NotificationNodeState)
    .addNode("findPlantDirectorNode", findPlantDirectorNode)
    .addNode("parseRecipientsNode", parseRecipientsNode)
    .addNode("notifyNode", notifyNode)
    .addNode("findPlantDirectorToolNode", new ToolNode([readNeo4jTool]))
    .addNode("notifyToolNode", new ToolNode([addEventTool, sendNotificationTool]))
    .addEdge(START, "findPlantDirectorNode")
    .addConditionalEdges("findPlantDirectorNode", shouldParseRecipients, [
        "findPlantDirectorToolNode",
        "parseRecipientsNode",
    ])
    .addEdge("findPlantDirectorToolNode", "findPlantDirectorNode")
    .addConditionalEdges("parseRecipientsNode", shouldContinue, [
        "notifyNode",
        "findPlantDirectorNode",
    ])
    .addConditionalEdges("notifyNode", shouldNotify, ["notifyToolNode", END])
    .addEdge("notifyToolNode", "notifyNode")
    .compile({ checkpointer });