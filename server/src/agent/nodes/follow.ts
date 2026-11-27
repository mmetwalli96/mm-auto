import {
    SystemMessage,
    AIMessage,
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

import { createCheckpointer } from "@utils";
import { FOLLOW_UP_PROMPT } from "@/agent/prompts";
import { replyEmailTool, getEmailsTool } from "@/agent/tools/notification";
import { add, subtract } from "@/agent/tools/math";
import { readSqlTool, readNeo4jTool, clearInterruptionCodeTool, createSupplyTool, addEventTool, setIncidentStatusTool, createSupplierTool } from "@/agent/tools/query";
import { llm } from "@clients";

const checkpointer = createCheckpointer("follow");

const FollowUpNodeState = new StateSchema({
    messages: MessagesValue,
    llmCalls: new ReducedValue(z.number().default(0), {
        reducer: (prev, curr) => prev + curr,
    }),
});

type FollowUpNodeStateType = typeof FollowUpNodeState;

const tools = [
    readSqlTool,
    readNeo4jTool,
    clearInterruptionCodeTool,
    createSupplyTool,
    createSupplierTool,
    addEventTool,
    setIncidentStatusTool,
    replyEmailTool,
    getEmailsTool,
    add,
    subtract
]
const llmWithTools = llm.bindTools(tools);

const followUpNode: GraphNode<FollowUpNodeStateType> = async (state) => {
    const systemMessage = new SystemMessage(FOLLOW_UP_PROMPT);
    const response = await llmWithTools.invoke([systemMessage, ...state.messages]);

    return {
        messages: [response],
        llmCalls: 1
    }
};

const toolNode = new ToolNode(tools);

const useTools: ConditionalEdgeRouter<FollowUpNodeStateType> = async (
    state,
) => {
    const lastMessage = state.messages.at(-1);

    if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
        return "followUpNode"
    }

    if (lastMessage.tool_calls?.length) {
        return "toolNode";
    }

    return END;
};

export const followUpAgent = new StateGraph(FollowUpNodeState)
    .addNode("followUpNode", followUpNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "followUpNode")
    .addConditionalEdges("followUpNode", useTools, ["toolNode", "followUpNode", END])
    .addEdge("toolNode", "followUpNode")
    .compile({ checkpointer })