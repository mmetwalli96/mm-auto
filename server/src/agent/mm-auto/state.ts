import { z } from "zod";
import { StateSchema, ReducedValue, MessagesValue } from "@langchain/langgraph";


import { SuppliersSchema, RecipientSchema, DetectionSchema } from "@schemas";

const AgentState = new StateSchema({
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

export { AgentState };