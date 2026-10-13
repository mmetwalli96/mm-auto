import dotenv from "dotenv";

dotenv.config();

const llmConfig = {
  model: process.env.MODEL!,
  apiKey: process.env.DEEPSEEK_API_KEY!,
  anthropicApiUrl: process.env.BASE_URL!,
  temperature: parseInt(process.env.TEMPERATURE!),
  recursionLimit: parseInt(process.env.RECURSION_LIMIT!),
};

const serverConfig = {
  host: process.env.SERVER_HOST!,
  port: parseInt(process.env.SERVER_PORT!),
}

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
    protocol: process.env.MONGODB_PROTOCOL!,
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

const mailtrapConfig = {
  token: process.env.MAILTRAP_API_TOKEN!,
  sender: {
    email: process.env.MAILTRAP_SENDER_EMAIL!,
    name: process.env.MAILTRAP_SENDER_NAME!,
  },
  folder: {
    id: process.env.MAILTRAP_FOLDER_ID!,
    name: process.env.MAILTRAP_FOLDER_NAME!,
  },
  inbox: {
    id: process.env.MAILTRAP_INBOX_ID!,
    name: process.env.MAILTRAP_INBOX_NAME!,
    address: process.env.MAILTRAP_INBOX_ADDRESS!,
  },
  domain: { id: process.env.MAILTRAP_DOMAIN_ID! },
};

const agendaConfig = {
  every: process.env.EVERY!,
  jobName: process.env.JOB_NAME!,
};

export { llmConfig, dbConfig, tavilyConfig, mailtrapConfig, agendaConfig, serverConfig };
