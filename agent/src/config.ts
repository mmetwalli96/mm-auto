import dotenv from "dotenv";

dotenv.config();

const llmConfig = {
  model: process.env.MODEL!,
  apiKey: process.env.DEEPSEEK_API_KEY!,
  anthropicApiUrl: process.env.BASE_URL!,
  temperature: parseInt(process.env.TEMPERATURE!),
  recursionLimit: parseInt(process.env.RECURSION_LIMIT!),
};

const tavilyConfig = {
  apiKey: process.env.TAVILY_API_KEY!,
  maxResults: parseInt(process.env.MAX_RESULTS!),
};

const dbConfig = {
  postgres: {
    host: process.env.POSTGRES_HOST!,
    port: parseInt(process.env.POSTGRES_PORT!),
    username: process.env.POSTGRES_USERNAME!,
    password: process.env.POSTGRES_PASSWORD!,
    database: process.env.POSTGRES_DB!,
  },
  neo4j: {
    host: process.env.NEO4J_HOST!,
    port: parseInt(process.env.NEO4J_PORT!),
    username: process.env.NEO4J_USERNAME!,
    password: process.env.NEO4J_PASSWORD!,
    database: process.env.NEO4J_DB!,
  },
  mongo: {
    host: process.env.MONGODB_HOST!,
    port: parseInt(process.env.MONGODB_PORT!),
    username: process.env.MONGODB_USERNAME!,
    password: process.env.MONGODB_PASSWORD!,
    database: {
      scheduler: process.env.MONGODB_SCHEDULER_NAME!,
      agent: process.env.MONGODB_AGENT_NAME!,
    },
  },
};

export { llmConfig, dbConfig, tavilyConfig };
