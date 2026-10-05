import { StateSchema, MessagesValue, ReducedValue } from "@langchain/langgraph";
import { z } from "zod";

import { SuppliersSchema } from "@schemas";

const AgentState = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(z.number().default(0), {
    reducer: (prev, curr) => prev + curr,
  }),
  suppliers: new ReducedValue(z.array(SuppliersSchema).default([]), {
    reducer: (prev, curr) => [...prev, ...curr],
  }),
});

export { AgentState };
