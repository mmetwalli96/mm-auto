import {
    SystemMessage,
    AIMessage,
    HumanMessage,
} from "@langchain/core/messages";
import {
    StateGraph,
    GraphNode,
    START,
    END,
    ConditionalEdgeRouter,
    StateSchema, MessagesValue, ReducedValue
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { llm } from "@clients";
import { createCheckpointer } from "@utils";
import { readNeo4jTool, readSqlTool } from "@/agent/tools/query";
import { add, subtract, multiply, divide } from "@/agent/tools/math";
import { DetectionSchema } from "@schemas";
import { SHORTFALL_STATUS_PROMPT, DETECTION_PROMPT } from "@/agent/prompts";

const checkpointer = createCheckpointer("detector");

const DetectionNodeState = new StateSchema({
    messages: MessagesValue,
    detections: new ReducedValue(z.array(DetectionSchema).default([]), {
        reducer: (prev, curr) => [...prev, ...curr],
    }),
    llmCalls: new ReducedValue(z.number().default(0), {
        reducer: (prev, curr) => prev + curr,
    }),
    shortfallStatus: new ReducedValue(z.boolean().nullable().default(null), {
        reducer: (_, curr) => curr,
    }),
    interruptionCode: new ReducedValue(z.string().nullable().default(null), {
        reducer: (_, curr) => curr,
    }),
});

type DetectionNodeStateType = typeof DetectionNodeState;

const confirmShortfallStatusNode: GraphNode<DetectionNodeStateType> = async (
    state,
) => {
    const tools = [readNeo4jTool, readSqlTool];
    const llmWithTools = llm.bindTools(tools);
    const systemMessage = new SystemMessage(SHORTFALL_STATUS_PROMPT);
    const response = await llmWithTools.invoke([
        systemMessage,
        ...state.messages,
    ]);
    return {
        messages: [response],
        llmCalls: 1,
    };
};

const parseShortfallStatusNode: GraphNode<DetectionNodeStateType> = async (
    state,
) => {
    const schema = z.object({ shortfallStatus: z.boolean(), interruptionCode: z.string().nullable().default(null) });
    const lastMessage = state.messages.at(-1);

    try {
        const raw = lastMessage!.text.replace(/```json|```/g, "").trim();
        const parsed = schema.parse(JSON.parse(raw));
        return {
            shortfallStatus: parsed.shortfallStatus,
            interruptionCode: parsed.interruptionCode,
        };
    } catch (error) {
        console.error("Failed to parse shortfall status from LLM response.", error);
        console.error("Raw LLM response:", lastMessage!.text);
        return {
            shortfallStatus: null,
            interruptionCode: null,
            messages: [
                new HumanMessage(
                    `Failed to parse shortfall status ${error}. ${lastMessage!.text} correct it, here is the schema: ${JSON.stringify(schema.toJSONSchema())}. Format of the response was incorrect.`,
                ),
            ],
        };
    }
};

const createDetectionRecordsNode: GraphNode<DetectionNodeStateType> = async (
    state,
) => {
    const tools = [readNeo4jTool, readSqlTool, add, subtract, multiply, divide];
    const systemMessage = new SystemMessage(DETECTION_PROMPT);
    const llmWithTools = llm.bindTools(tools);
    const response = await llmWithTools.invoke([
        systemMessage,
        new HumanMessage(`The interruption code was found by you and it is ${state.interruptionCode}`),
        ...state.messages,
    ]);

    return {
        messages: [response],
        llmCalls: 1,
    };

};

const parseDetectionRecordsNode: GraphNode<DetectionNodeStateType> = async (
    state,
) => {
    const schema = z.array(DetectionSchema);
    const lastMessage = state.messages.at(-1);

    try {
        const raw = lastMessage!.text.replace(/```json|```/g, "").trim();
        const parsed = schema.parse(JSON.parse(raw));
        return {
            detections: parsed,
        };
    } catch (error) {
        console.error(
            "Failed to parse detection records from LLM response.",
            error,
        );
        console.error("Raw LLM response:", lastMessage!.text);

        return {
            messages: [
                new HumanMessage(
                    `Failed to parse detection records. ${error}. ${lastMessage!.text} correct it, here is the schema: ${JSON.stringify(schema.toJSONSchema())}. The record was found but the format was incorrect.`,
                ),
            ],
        };
    }
};

const shouldContinue: ConditionalEdgeRouter<DetectionNodeStateType> = async (
    state,
) => {
    if (state.shortfallStatus) {
        return "createDetectionRecordsNode";
    }
    if (state.shortfallStatus === null) {
        return "confirmShortfallStatusNode";
    }
    return END;
};

const useConfirmShortfallStatusTools: ConditionalEdgeRouter<
    DetectionNodeStateType
> = async (state) => {
    const lastMessage = state.messages.at(-1);

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
        return "parseShortfallStatusNode";
    }
    if (lastMessage.tool_calls?.length) {
        return "confirmShortfallStatusToolNode";
    }

    return "parseShortfallStatusNode";
};

const useCreateDetectionRecordsTools: ConditionalEdgeRouter<
    DetectionNodeStateType
> = async (state) => {
    const lastMessage = state.messages.at(-1);

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
        return "parseDetectionRecordsNode";
    }
    if (lastMessage.tool_calls?.length) {
        return "createDetectionRecordsToolNode";
    }

    return "parseDetectionRecordsNode";
};

const shouldFinish: ConditionalEdgeRouter<DetectionNodeStateType> = async (
    state,
) => {
    if (state.detections?.length > 0) {
        return END;
    }
    return "createDetectionRecordsNode";
};

export const detector = new StateGraph(DetectionNodeState)
    .addNode("confirmShortfallStatusNode", confirmShortfallStatusNode)
    .addNode("parseShortfallStatusNode", parseShortfallStatusNode)
    .addNode("createDetectionRecordsNode", createDetectionRecordsNode)
    .addNode("createDetectionRecordsToolNode", new ToolNode([readNeo4jTool, readSqlTool, add, subtract, multiply, divide]))
    .addNode("confirmShortfallStatusToolNode", new ToolNode([readNeo4jTool, readSqlTool]))
    .addNode("parseDetectionRecordsNode", parseDetectionRecordsNode)

    .addEdge(START, "confirmShortfallStatusNode")
    .addConditionalEdges(
        "confirmShortfallStatusNode",
        useConfirmShortfallStatusTools,
        ["confirmShortfallStatusToolNode", "parseShortfallStatusNode"],
    )
    .addEdge("confirmShortfallStatusToolNode", "confirmShortfallStatusNode")
    .addConditionalEdges("parseShortfallStatusNode", shouldContinue, [
        "createDetectionRecordsNode",
        "confirmShortfallStatusNode",
        END,
    ])
    .addConditionalEdges(
        "createDetectionRecordsNode",
        useCreateDetectionRecordsTools,
        ["createDetectionRecordsToolNode", "parseDetectionRecordsNode"],
    )
    .addEdge("createDetectionRecordsToolNode", "createDetectionRecordsNode")
    .addConditionalEdges("parseDetectionRecordsNode", shouldFinish, [
        "createDetectionRecordsNode",
        END,
    ])
    .compile({ checkpointer });