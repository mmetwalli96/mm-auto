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

import { tools, toolsByName } from "@/graphs/search/tools";
import { llm } from "@clients";
import { AgentState } from "@/graphs/search/state";
import { checkpointer } from "@/graphs/search/checkpointer";
import { SEARCH_PROMPT } from "@/graphs/search/prompts";
import { SuppliersSchema } from "@schemas";

const llmWithTools = llm.bindTools(tools);

const findSuppliersNode: GraphNode<typeof AgentState> = async (state) => {
  const systemMessage = new SystemMessage(SEARCH_PROMPT);
  const response = await llmWithTools.invoke([
    systemMessage,
    ...state.messages,
  ]);
  return {
    llmCalls: 1,
    messages: [response],
  };
};

const parseSuppliersNode: GraphNode<typeof AgentState> = async (state) => {
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
    console.error("Failed to parse suppliers JSON:", error);
    console.error("Raw LLM response:", lastMessage!.text);
    return {
      messages: [
        new HumanMessage(
          `Failed to parse detection records. ${error}. ${lastMessage!.text} correct it, here is the schema: ${JSON.stringify(schema.toJSONSchema())}`,
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

const useFindSuppliersTools: ConditionalEdgeRouter<typeof AgentState> = async (
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

const shouldFinish: ConditionalEdgeRouter<typeof AgentState> = async (
  state,
) => {
  if (state.suppliers.length > 0) {
    return END;
  }
  return "findSuppliersNode";
};

const searchAgent = new StateGraph(AgentState)
  .addNode("findSuppliersNode", findSuppliersNode)
  .addNode("parseSuppliersNode", parseSuppliersNode)
  .addNode("findSuppliersToolNode", toolNode)
  .addEdge(START, "findSuppliersNode")
  .addConditionalEdges("findSuppliersNode", useFindSuppliersTools, [
    "findSuppliersToolNode",
    "parseSuppliersNode",
  ])
  .addEdge("findSuppliersToolNode", "findSuppliersNode")
  .addConditionalEdges("parseSuppliersNode", shouldFinish, ["findSuppliersNode", END])
  .compile({ checkpointer });

export { searchAgent as searcher };
