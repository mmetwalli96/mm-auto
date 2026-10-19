import {
    SystemMessage,
    AIMessage,
    ToolMessage
} from "@langchain/core/messages";
import {
    StateGraph,
    GraphNode,
    START,
    END,
    ConditionalEdgeRouter,
} from "@langchain/langgraph";

import { tools, toolsByName } from "@/graphs/follow/tools";
import { llm } from "@clients";
import { AgentState } from "@/graphs/follow/state";
import { FOLLOW_UP_PROMPT } from "@/graphs/follow/prompts";
import { checkpointer } from "@/graphs/follow/checkpointer";

const llmWithTools = llm.bindTools(tools);

const followUpNode: GraphNode<typeof AgentState> = async (state) => {
    const systemMessage = new SystemMessage(FOLLOW_UP_PROMPT);
    const response = await llmWithTools.invoke([systemMessage, ...state.messages]);

    return {
        messages: [response],
        llmCall: 1
    }
};

const toolNode: GraphNode<typeof AgentState> = async (state) => {
    const lastMessage = state.messages.at(-1);

    if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
        return {
            messages: [],
        };
    }

    const result: ToolMessage[] = [];
    for (const toolCall of lastMessage.tool_calls ?? []) {
        const tool = toolsByName[toolCall.name as keyof typeof toolsByName];
        const observation = await tool.invoke(toolCall);
        result.push(observation);
    }

    return {
        llmCalls: 0,
        messages: result,
    };
};

const useTools: ConditionalEdgeRouter<typeof AgentState> = async (
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

const followUpAgent = new StateGraph(AgentState)
    .addNode("followUpNode", followUpNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "followUpNode")
    .addConditionalEdges("followUpNode", useTools, ["toolNode", "followUpNode", END])
    .addEdge("toolNode", "followUpNode")
    .compile({ checkpointer })

export { followUpAgent };


