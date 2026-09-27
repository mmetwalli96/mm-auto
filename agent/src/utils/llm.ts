import { ChatAnthropic } from "@langchain/anthropic";
import { llmConfig } from "./utils/config";

const llm = new ChatAnthropic({
  model: llmConfig.model,
  apiKey: llmConfig.apiKey,
  anthropicApiUrl: llmConfig.anthropicApiUrl,
});

export { llm };