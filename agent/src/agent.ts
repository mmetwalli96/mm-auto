import { tools } from "./tools";
import { llm } from "./llm";
import { createAgent } from "langchain";
import { SYSTEM_PROMPT } from "./prompts";


const agent = createAgent({
  model: llm,
  tools: tools,
  systemPrompt: SYSTEM_PROMPT
});

export { agent };
