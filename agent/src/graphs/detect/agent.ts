import {
  SystemMessage,
  AIMessage,
  ToolMessage,
  HumanMessage,
} from "@langchain/core/messages";
import {
  StateGraph,
  GraphNode,
  START,
  END,
  ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { z } from "zod";

import { tools, toolsByName } from "@/graphs/detect/tools";
import { llm } from "@clients";
import { AgentState } from "@/graphs/detect/state";
import {
  SHORTFALL_STATUS_PROMPT,
  DETECTION_PROMPT,
} from "@/graphs/detect/prompts";
import { DetectionSchema } from "@schemas";
import { checkpointer } from "@/graphs/detect/checkpointer";
import { saveGraphAsPng } from "@utils";

const llmWithTools = llm.bindTools(tools);

const confirmShortfallStatusNode: GraphNode<typeof AgentState> = async (
  state,
) => {
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

const parseShortfallStatusNode: GraphNode<typeof AgentState> = async (
  state,
) => {
  const schema = z.object({ shortfallStatus: z.boolean() });
  const lastMessage = state.messages.at(-1);

  try {
    const raw = lastMessage!.text.replace(/```json|```/g, "").trim();
    const parsed = schema.parse(JSON.parse(raw));
    return {
      shortfallStatus: parsed.shortfallStatus,
    };
  } catch (error) {
    console.error("Failed to parse shortfall status from LLM response.", error);
    console.error("Raw LLM response:", lastMessage!.text);
    return {
      shortfallStatus: null,
      messages: [
        new HumanMessage(
          `Failed to parse shortfall status ${error}. ${lastMessage!.text} correct it, here is the schema: ${JSON.stringify(schema.toJSONSchema())}. Format of the response was incorrect.`,
        ),
      ],
    };
  }
};

const createDetectionRecordsNode: GraphNode<typeof AgentState> = async (
  state,
) => {
  const systemMessage = new SystemMessage(DETECTION_PROMPT);
  const response = await llmWithTools.invoke([
    systemMessage,
    ...state.messages,
  ]);

  return {
    messages: [response],
    llmCalls: 1,
  };
};

const parseDetectionRecordsNode: GraphNode<typeof AgentState> = async (
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
    console.error("Failed to parse detection records from LLM response.", error);
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

const shouldContinue: ConditionalEdgeRouter<typeof AgentState> = async (
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
  typeof AgentState
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
  typeof AgentState
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

const shouldFinish: ConditionalEdgeRouter<typeof AgentState> = async (
  state,
) => {
  if (state.detections?.length > 0) {
    return END;
  }
  return "createDetectionRecordsNode";
};

const detectAgent = new StateGraph(AgentState)
  .addNode("confirmShortfallStatusNode", confirmShortfallStatusNode)
  .addNode("parseShortfallStatusNode", parseShortfallStatusNode)
  .addNode("createDetectionRecordsNode", createDetectionRecordsNode)
  .addNode("createDetectionRecordsToolNode", toolNode)
  .addNode("confirmShortfallStatusToolNode", toolNode)
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

saveGraphAsPng(detectAgent, "../resources/imgs/graphs/detector.png");

export { detectAgent as detector };
