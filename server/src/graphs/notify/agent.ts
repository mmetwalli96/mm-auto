import {
  SystemMessage,
  AIMessage,
  ToolMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import {
  StateGraph,
  GraphNode,
  START,
  END,
  ConditionalEdgeRouter,
} from "@langchain/langgraph";

import { tools, toolsByName } from "@/graphs/notify/tools";
import { llm } from "@clients";
import { AgentState } from "@/graphs/notify/state";
import {
  NOTIFY_PROMPT,
  FIND_PLANT_DIRECTOR_PROMPT,
} from "@/graphs/notify/prompts";
import { checkpointer } from "@/graphs/notify/checkpointer";
import { RecipientSchema } from "@schemas";

const llmWithTools = llm.bindTools(tools);

const findPlantDirectorNode: GraphNode<typeof AgentState> = async (state) => {

  const systemMessage = new SystemMessage(FIND_PLANT_DIRECTOR_PROMPT);
  const response = await llmWithTools.invoke([
    systemMessage,
    ...state.messages,
  ]);

  return {
    llmCalls: 1,
    messages: [response],
  };
};

const parseRecipientNode: GraphNode<typeof AgentState> = async (state) => {
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

const notifyNode: GraphNode<typeof AgentState> = async (state) => {
  const systemMessage = new SystemMessage(
    NOTIFY_PROMPT(JSON.stringify(state.recipients)),
  );
  const response = await llmWithTools.invoke([
    systemMessage,
    ...state.messages,
  ]);
  return {
    llmCalls: 1,
    messages: [response],
  };
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

const shouldParseRecipient: ConditionalEdgeRouter<typeof AgentState> = async (
  state,
) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return "parseRecipientNode";
  }
  if (lastMessage.tool_calls?.length) {
    return "findPlantDirectorToolNode";
  }
  return "parseRecipientNode";
};

const shouldContinue: ConditionalEdgeRouter<typeof AgentState> = async (
  state,
) => {
  if (state.recipients.length > 0) {
    return "notifyNode";
  }

  return "findPlantDirectorNode";
};

const shouldNotify: ConditionalEdgeRouter<typeof AgentState> = async (
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

const notifyAgent = new StateGraph(AgentState)
  .addNode("findPlantDirectorNode", findPlantDirectorNode)
  .addNode("parseRecipientNode", parseRecipientNode)
  .addNode("notifyNode", notifyNode)
  .addNode("findPlantDirectorToolNode", toolNode)
  .addNode("notifyToolNode", toolNode)
  .addEdge(START, "findPlantDirectorNode")
  .addConditionalEdges("findPlantDirectorNode", shouldParseRecipient, [
    "findPlantDirectorToolNode",
    "parseRecipientNode",
  ])
  .addEdge("findPlantDirectorToolNode", "findPlantDirectorNode")
  .addConditionalEdges("parseRecipientNode", shouldContinue, [
    "notifyNode",
    "findPlantDirectorNode",
  ])
  .addConditionalEdges("notifyNode", shouldNotify, ["notifyToolNode", END])
  .addEdge("notifyToolNode", "notifyNode")
  .compile({ checkpointer });

export { notifyAgent as notifier };
