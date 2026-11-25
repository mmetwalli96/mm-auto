
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
    ConditionalEdgeRouter
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { SuppliersSchema } from "@schemas";
import { ALTERNATIVE_SUPPLIER_PROMPT } from "@/agent/prompts";
import { llm } from "@clients";
import { readNeo4jTool } from "@/agent/tools/query"
import { createCheckpointer } from "@utils";
import { TavilySearch } from "@langchain/tavily";
import { tavilyConfig } from "@config";


const checkpointer = createCheckpointer("researcher");

const ResearchNodeState = new StateSchema({
    messages: MessagesValue,
    llmCalls: new ReducedValue(z.number().default(0), {
        reducer: (prev, curr) => prev + curr,
    }),
    suppliers: new ReducedValue(z.array(SuppliersSchema).default([]), {
        reducer: (prev, curr) => [...prev, ...curr],
    }),
});

type ResearchNodeStateType = typeof ResearchNodeState;

const searchTool = new TavilySearch({
    maxResults: tavilyConfig.maxResults,
    tavilyApiKey: tavilyConfig.apiKey,
});
const tools = [readNeo4jTool, searchTool];
const llmWithTools = llm.bindTools(tools);

const findSuppliersNode: GraphNode<ResearchNodeStateType> = async (
    state,
) => {
    const systemMessage = new SystemMessage(ALTERNATIVE_SUPPLIER_PROMPT);
    const response = await llmWithTools.invoke([
        systemMessage,
        ...state.messages,
    ]);

    return {
        messages: [response],
        llmCalls: 1,
    };
};

const parseSuppliersNode: GraphNode<ResearchNodeStateType> = async (
    state,
) => {
    const schema = z.array(SuppliersSchema);
    const lastMessage = state.messages.at(-1);

    try {
        const raw = lastMessage!.text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
        const parsed = schema.parse(JSON.parse(raw));
        return {
            suppliers: parsed,
        };

    } catch (error) {
        console.error("Failed to parse suppliers from LLM response.", error);
        console.error("Raw LLM response:", lastMessage!.text);

        return {
            messages: [
                new HumanMessage(
                    `Failed to parse suppliers. ${error}. ${lastMessage!.text} correct it, here is the schema: ${JSON.stringify(schema.toJSONSchema())}. The record was found but the format was incorrect.`,
                ),
            ],
        };
    }
};

const toolNode = new ToolNode(tools);

const useFindSuppliersTools: ConditionalEdgeRouter<ResearchNodeStateType> = async (
    state,
) => {
    const lastMessage = state.messages.at(-1);

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
        return "parseSuppliersNode";
    }
    if (lastMessage.tool_calls?.length) {
        return "findSuppliersToolNode";
    }

    return "parseSuppliersNode";
};

const shouldFinish: ConditionalEdgeRouter<ResearchNodeStateType> = async (
    state,
) => {
    if (state.suppliers.length > 0) {
        return END;
    }
    return "findSuppliersNode";
};

export const researcher = new StateGraph(ResearchNodeState)
    .addNode("findSuppliersNode", findSuppliersNode)
    .addNode("parseSuppliersNode", parseSuppliersNode)
    .addNode("findSuppliersToolNode", toolNode)
    .addEdge(START, "findSuppliersNode")
    .addConditionalEdges("findSuppliersNode", useFindSuppliersTools, [
        "findSuppliersToolNode",
        "parseSuppliersNode",
    ])
    .addEdge("findSuppliersToolNode", "findSuppliersNode")
    .addConditionalEdges("parseSuppliersNode", shouldFinish, [
        "findSuppliersNode",
        END,
    ])
    .compile({ checkpointer });