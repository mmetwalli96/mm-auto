import { StateSchema, MessagesValue, ReducedValue } from "@langchain/langgraph";
import { z } from "zod";

import { recipientSchema } from "@schemas";

const AgentState = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(z.number().default(0), {
    reducer: (prev, curr) => prev + curr,
  }),
  recipients: new ReducedValue(z.array(recipientSchema).default([]), {
    reducer: (prev, curr) => [...prev, ...curr],
  }),
});

export { AgentState };