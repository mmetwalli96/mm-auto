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
    ssl: process.env.POSTGRES_SSL === "true" ? true : false,
  },
  neo4j: {
    uri: process.env.NEO4J_URI!,
    username: process.env.NEO4J_USERNAME!,
    password: process.env.NEO4J_PASSWORD!,
    database: process.env.NEO4J_DATABASE!,
  },
  mongo: {
    protocol: process.env.MONGODB_PROTOCOL!,
    host: process.env.MONGODB_HOST!,
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

const githubConfig = {
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
  repositoryPath: process.env.REPOSITORY_PATH!,
  timeout: parseInt(process.env.TIMEOUT!),
};

export { llmConfig, dbConfig, tavilyConfig, mailtrapConfig, agendaConfig, serverConfig, githubConfig };
