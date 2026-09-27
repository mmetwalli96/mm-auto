import { tools } from "./tools";
import { llm } from "./utils/llm";
import { createAgent } from "langchain";
import { DETECT_SYSTEM_PROMPT } from "./prompts";

// detect agent
const agent = createAgent({
  model: llm,
  tools: tools,
  systemPrompt: DETECT_SYSTEM_PROMPT
});

export { agent };
