import { z } from "zod";
import { StateSchema, ReducedValue, MessagesValue } from "@langchain/langgraph";

const AgentState = new StateSchema({
    messages: MessagesValue,
    llmCalls: new ReducedValue(z.number().default(0), {
        reducer: (prev, curr) => prev + curr,
    }),
});

export { AgentState }