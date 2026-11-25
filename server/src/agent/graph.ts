import { HumanMessage } from "@langchain/core/messages";
import {
    StateGraph,
    GraphNode,
    START,
    END,
    ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { randomUUID } from "crypto";
import { z } from "zod";
import { StateSchema, ReducedValue, MessagesValue } from "@langchain/langgraph";

import { SuppliersSchema, RecipientSchema, DetectionSchema } from "@schemas";
import { createCheckpointer } from "@utils";
import { llmConfig } from "@config";
import { detector } from "@/agent/nodes/detect"
import { researcher } from "@/agent/nodes/search"
import { notifier } from "@/agent/nodes/notify"
import { followUpAgent } from "@/agent/nodes/follow"

const recursionLimit = llmConfig.recursionLimit;
const checkpointer = createCheckpointer("mmauto");

const State = new StateSchema({
    messages: MessagesValue,
    detections: new ReducedValue(z.array(DetectionSchema).default([]), {
        reducer: (prev, curr) => [...prev, ...curr],
    }),
    suppliers: new ReducedValue(z.array(SuppliersSchema).default([]), {
        reducer: (prev, curr) => [...prev, ...curr],
    }),
    recipients: new ReducedValue(z.array(RecipientSchema).default([]), {
        reducer: (prev, curr) => [...prev, ...curr],
    }),
    shortfallStatus: new ReducedValue(z.boolean().default(false), {
        reducer: (_, curr) => curr,
    }),
    toResolve: new ReducedValue(z.boolean().default(false), {
        reducer: (_, curr) => curr,
    }),
});

type State = typeof State;

const respondNode: GraphNode<State> = async (state) => {
    const followUpThreadId = `follow-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
    const followUpConfig = {
        configurable: { thread_id: followUpThreadId },
        recursionLimit: recursionLimit,
    };

    const lastMessage = state.messages.at(-1)!;

    const followUpResponse = await followUpAgent.invoke(
        { messages: [lastMessage] },
        followUpConfig,
    );
    return {
        messages: followUpResponse.messages,
    };
};

const detectNode: GraphNode<State> = async (state) => {
    const lastMessage = state.messages.at(-1)!;
    const detectionThreadId = `detect-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
    const detectionConfig = {
        configurable: { thread_id: detectionThreadId },
        recursionLimit: recursionLimit,
    };
    const response = await detector.invoke(
        { messages: [lastMessage] },
        detectionConfig,
    );

    return {
        detections: response.detections,
        messages: response.messages,
        shortfallStatus: response.shortfallStatus!,
    };
};

const searchNode: GraphNode<State> = async (state) => {
    const searchThreadId = `search-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
    const searchConfig = {
        configurable: { thread_id: searchThreadId },
        recursionLimit: recursionLimit,
    };
    const response = await researcher.invoke(
        {
            messages: [
                new HumanMessage(
                    `Here are the detection records: ${JSON.stringify(state.detections)}`,
                ),
            ],
        },
        searchConfig,
    );

    return {
        suppliers: response.suppliers,
        messages: response.messages,
    };

};

const notifyNode: GraphNode<State> = async (state) => {
    const notifyThreadId = `notify-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
    const notifyConfig = {
        configurable: { thread_id: notifyThreadId },
        recursionLimit: recursionLimit,
    };
    const response = await notifier.invoke(
        {
            messages: [
                new HumanMessage(
                    `Here are the list of alternative suppliers per part: ${JSON.stringify(state.suppliers)} and the detection records: ${JSON.stringify(state.detections)}`,
                ),
            ],
        },
        notifyConfig,
    );

    return {
        messages: response.messages,
        recipients: response.recipients,
    };
};

const detectOrRespond: ConditionalEdgeRouter<State> = async (
    state,
) => {
    if (state.toResolve) {
        return "respondNode";
    }
    return "detectNode";
};

const shouldSearch: ConditionalEdgeRouter<State> = async (
    state,
) => {
    if (state.shortfallStatus) {
        return "searchNode";
    }
    return END;
};

export const mmautoAgent = new StateGraph(State)
    .addNode("respondNode", respondNode)
    .addNode("detectNode", detectNode)
    .addNode("searchNode", searchNode)
    .addNode("informNode", notifyNode)
    .addConditionalEdges(START, detectOrRespond, ["respondNode", "detectNode"])
    .addEdge("respondNode", END)
    .addConditionalEdges("detectNode", shouldSearch, ["searchNode", END])
    .addEdge("searchNode", "informNode")
    .addEdge("informNode", END)
    .compile({ checkpointer });
