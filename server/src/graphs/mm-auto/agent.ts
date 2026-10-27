import { HumanMessage } from "@langchain/core/messages";
import {
  StateGraph,
  GraphNode,
  START,
  END,
  ConditionalEdgeRouter,
} from "@langchain/langgraph";
import { randomUUID } from "crypto";

import { AgentState } from "@/graphs/mm-auto/state";
import { checkpointer } from "@/graphs/mm-auto/checkpointer";
import { detector } from "@/graphs/detect/agent";
import { searcher } from "@/graphs/search/agent";
import { notifier } from "@/graphs/notify/agent";
import { followUpAgent } from "@/graphs/follow/agent";
import { llmConfig } from "@config";

const recursionLimit = llmConfig.recursionLimit;

const respondNode: GraphNode<typeof AgentState> = async (state) => {
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

const detectNode: GraphNode<typeof AgentState> = async (state) => {
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

const searchNode: GraphNode<typeof AgentState> = async (state) => {
  const searchThreadId = `search-${new Date().toISOString()}-${randomUUID().slice(0, 12)}`;
  const searchConfig = {
    configurable: { thread_id: searchThreadId },
    recursionLimit: recursionLimit,
  };
  const response = await searcher.invoke(
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

const notifyNode: GraphNode<typeof AgentState> = async (state) => {
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

const detectOrRespond: ConditionalEdgeRouter<typeof AgentState> = async (
  state,
) => {
  if (state.toResolve) {
    return "respondNode";
  }
  return "detectNode";
};

const shouldSearch: ConditionalEdgeRouter<typeof AgentState> = async (
  state,
) => {
  if (state.shortfallStatus) {
    return "searchNode";
  }
  return END;
};

const autoAgentGraph = new StateGraph(AgentState)
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

export { autoAgentGraph };
