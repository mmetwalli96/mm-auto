import { StateSchema, MessagesValue, ReducedValue } from "@langchain/langgraph";
import { z } from "zod";

import { DetectionSchema } from "@schemas";

const AgentState = new StateSchema({
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
});

export { AgentState };
