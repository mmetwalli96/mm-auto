import { ChatAnthropic } from "@langchain/anthropic";
import { llmConfig } from "@config";

const llm = new ChatAnthropic({
  model: llmConfig.model,
  apiKey: llmConfig.apiKey,
  anthropicApiUrl: llmConfig.anthropicApiUrl,
  temperature: llmConfig.temperature,
});

export { llm };